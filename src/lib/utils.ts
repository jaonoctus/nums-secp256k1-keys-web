import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { computed, onBeforeMount, ref } from 'vue'
import * as secp256k1 from '@noble/secp256k1'
import { NUMS_METHOD } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

async function sha256(data: Uint8Array) {
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toLowerCase()
}

function isValidHex(str: string): boolean {
  const hexRegex = /^[0-9a-fA-F]+$/
  return hexRegex.test(str)
}

function validateAndPadHex(hex: string): string {
  if (!hex) {
    throw new Error('Input must be a string')
  }

  // Remove '0x' prefix if present
  hex = hex.toLowerCase().replace('0x', '')

  // Check if it's a valid hex string
  if (!isValidHex(hex)) {
    throw new Error('Invalid hex string')
  }

  // Check maximum length (32 bytes = 64 characters)
  if (hex.length > 64) {
    throw new Error('Hex string too long - maximum 32 bytes allowed')
  }

  // Pad to 64 characters
  return hex.padStart(64, '0')
}

export function useSecp256k1() {
  const G = secp256k1.ProjectivePoint.BASE

  async function generateHXPoint() {
    const xCoord = await sha256(G.toRawBytes(false))

    return secp256k1.ProjectivePoint.fromHex(`02${xCoord}`)
  }

  async function numsFromTag(tag: string): Promise<string> {
    let ctr = 0
    while (true) {
      const encoder = new TextEncoder()
      const tagBytes = encoder.encode(tag)

      const counterBytes = new Uint8Array(4)
      new DataView(counterBytes.buffer).setUint32(0, ctr, true) // true for little endian

      const combinedBytes = new Uint8Array(tagBytes.length + counterBytes.length)
      combinedBytes.set(tagBytes, 0)
      combinedBytes.set(counterBytes, tagBytes.length)
      const candidateHash = await sha256(combinedBytes)

      try {
        const candidate = secp256k1.etc.hexToBytes(candidateHash)
        const xCoordBytes = candidate.slice(0, 32)
        const pk = secp256k1.ProjectivePoint.fromHex(`02${secp256k1.etc.bytesToHex(xCoordBytes)}`)
        return pk.x.toString(16).padStart(64, '0')
      } catch {
        ctr += 1
      }
    }
  }

  async function computeNUMS(R: string, method: NUMS_METHOD = NUMS_METHOD.UNKNOWN_DL_HIDING_KEY, tag: string = 'Labitbu') {
    if (method === NUMS_METHOD.TAG) {
      return await numsFromTag(tag)
    } else {
      const validatedR = validateAndPadHex(R)
      const H = await generateHXPoint()
      const r = secp256k1.etc.bytesToNumberBE(secp256k1.etc.hexToBytes(validatedR))
      const rG = G.multiply(r)
      const pk = H.add(rG)
      return pk.x.toString(16).padStart(64, '0')
    }
  }

  async function validateNUMS(R: string, PK: string, method: NUMS_METHOD = NUMS_METHOD.UNKNOWN_DL_HIDING_KEY, tag: string = 'Labitbu') {
    if (!PK) {
      return false
    }

    if (method === NUMS_METHOD.TAG) {
      const computedPK = await numsFromTag(tag)
      return computedPK === PK
    } else {
      if (!R) {
        return false
      }
      return await computeNUMS(R) === PK
    }
  }

  return {
    computeNUMS,
    validateNUMS,
    numsFromTag
  }
}

export function useForm() {
  const { computeNUMS, validateNUMS, numsFromTag } = useSecp256k1()

  let isCleaning = false
  const input = ref('')
  const R = ref('')
  const PK = ref('')
  const isNUMS = ref(false)
  const numsMethod = ref<NUMS_METHOD>(NUMS_METHOD.UNKNOWN_DL_HIDING_KEY)
  const tagInput = ref('Labitbu')

  const shouldValidateNUMS = computed(() => {
    return PK.value.length === 64
    // && form.R.length === 64
  })

  async function generateRandom() {
    if (numsMethod.value === NUMS_METHOD.TAG) {
      input.value = ''
      R.value = ''
      PK.value = await numsFromTag(tagInput.value)
      isNUMS.value = await validateNUMS(R.value, PK.value, numsMethod.value, tagInput.value)
    } else {
      const rHEX = window.crypto.getRandomValues(new Uint8Array(32)).reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')
      input.value = ''
      R.value = rHEX
      PK.value = await computeNUMS(rHEX, numsMethod.value)
      isNUMS.value = await validateNUMS(R.value, PK.value, numsMethod.value)
    }
  }

  async function generateFromInput() {
    if (numsMethod.value === NUMS_METHOD.TAG) {
      R.value = ''
      PK.value = await numsFromTag(input.value)
      tagInput.value = input.value
      isNUMS.value = await validateNUMS(R.value, PK.value, numsMethod.value, tagInput.value)
    } else {
      const rHEX = await computeR(input.value)
      R.value = rHEX
      PK.value = await computeNUMS(rHEX, numsMethod.value)
      isNUMS.value = await validateNUMS(R.value, PK.value, numsMethod.value)
    }
  }

  async function setRFromInput() {
    if (!isCleaning) {
      if (numsMethod.value === NUMS_METHOD.UNKNOWN_DL_HIDING_KEY) {
        R.value = await computeR(input.value)
        isNUMS.value = await validateNUMS(R.value, PK.value, numsMethod.value)
      } else if (numsMethod.value === NUMS_METHOD.TAG) {
        // For tag method, validate using the input as the tag
        isNUMS.value = await validateNUMS(R.value, PK.value, numsMethod.value, input.value)
      }
    }
  }

  async function clearText() {
    isCleaning = true
    input.value = ''
    if (numsMethod.value === NUMS_METHOD.TAG) {
      isNUMS.value = await validateNUMS(R.value, PK.value, numsMethod.value, tagInput.value)
    } else {
      isNUMS.value = await validateNUMS(R.value, PK.value, numsMethod.value, tagInput.value)
    }
    setTimeout(() => {
      isCleaning = false
    }, 0)
  }

  async function computeR(text: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    return sha256(data)
  }

  async function toggleMethod() {
    // Clear current values when switching methods
    PK.value = ''
    if (numsMethod.value === NUMS_METHOD.TAG) {
      tagInput.value = input.value || 'Labitbu'
      R.value = ''
    } else {
      // For liftX method, set default "unspendable" if no input
      if (!input.value) {
        input.value = 'unspendable'
      }
    }
    await generateFromInput()
  }

  onBeforeMount(async () => {
    const url = new URL(window.location.href)
    const inputFromParams = url.searchParams.get('input')
    const rFromParams = url.searchParams.get('r')
    const pkFromParams = url.searchParams.get('pk')
    const methodFromParams = url.searchParams.get('method') as string | null
    const tagFromParams = url.searchParams.get('tag')

    if (methodFromParams && (methodFromParams === NUMS_METHOD.UNKNOWN_DL_HIDING_KEY || methodFromParams === NUMS_METHOD.TAG)) {
      numsMethod.value = methodFromParams as NUMS_METHOD
    }

    if (tagFromParams && numsMethod.value === NUMS_METHOD.TAG) {
      tagInput.value = tagFromParams
    }

    if (inputFromParams && pkFromParams) {
      input.value = inputFromParams
      if (numsMethod.value === NUMS_METHOD.UNKNOWN_DL_HIDING_KEY) {
        R.value = await computeR(inputFromParams)
      } else if (numsMethod.value === NUMS_METHOD.TAG) {
        // For tag method, set tagInput to the input from URL params
        tagInput.value = inputFromParams
      }
      PK.value = pkFromParams.toLowerCase()
    } else if (rFromParams && pkFromParams) {
      R.value = rFromParams
      PK.value = pkFromParams
    } else if (pkFromParams) {
      PK.value = pkFromParams
    } else {
      input.value = 'unspendable'
      await generateFromInput()
    }

    // Validate using the correct tag value based on method
    if (numsMethod.value === NUMS_METHOD.TAG) {
      isNUMS.value = await validateNUMS(R.value, PK.value, numsMethod.value, input.value)
    } else {
      isNUMS.value = await validateNUMS(R.value, PK.value, numsMethod.value, tagInput.value)
    }
  })

  return {
    input,
    R,
    PK,
    isNUMS,
    shouldValidateNUMS,
    numsMethod,
    tagInput,
    generateRandom,
    generateFromInput,
    setRFromInput,
    clearText,
    toggleMethod
  }
}
