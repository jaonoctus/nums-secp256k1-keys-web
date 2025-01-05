import { useClipboard } from '@vueuse/core'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { computed, onBeforeMount, ref } from 'vue'
import * as secp256k1 from '@noble/secp256k1'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useCopyToClipboard(title: string, value: string) {
  const { copy, isSupported } = useClipboard()

  function copyToClipboard() {
    copy(value)
  }

  return {
    copyToClipboard,
    isSupported,
  }
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

  async function computeNUMS(R: string) {
    const validatedR = validateAndPadHex(R)
    const H = await generateHXPoint()
    console.log('H', H)
    const r = secp256k1.etc.bytesToNumberBE(secp256k1.etc.hexToBytes(validatedR))
    const rG = G.multiply(r)
    const pk = H.add(rG)
    return pk.x.toString(16).padStart(64, '0')
  }

  async function validateNUMS(R: string, PK: string) {
    if (!R || !PK) {
      return false
    }
    return await computeNUMS(R) === PK
  }

  return {
    computeNUMS,
    validateNUMS
  }
}

export function useForm() {
  const { computeNUMS, validateNUMS } = useSecp256k1()

  let isCleaning = false
  const input = ref('')
  const R = ref('')
  const PK = ref('')
  const isNUMS = ref(false)

  const shouldValidateNUMS = computed(() => {
    return PK.value.length === 64
    // && form.R.length === 64
  })

  async function generateRandom() {
    const rHEX = window.crypto.getRandomValues(new Uint8Array(32)).reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')
    input.value = ''
    R.value = rHEX
    PK.value = await computeNUMS(rHEX)
    isNUMS.value = await validateNUMS(R.value, PK.value)
  }

  async function generateFromInput() {
    const rHEX = await computeR(input.value)
    R.value = rHEX
    PK.value = await computeNUMS(rHEX)
    isNUMS.value = await validateNUMS(R.value, PK.value)
  }

  async function setRFromInput() {
    if (!isCleaning) {
      R.value = await computeR(input.value)
      isNUMS.value = await validateNUMS(R.value, PK.value)
    }
  }

  async function clearText() {
    isCleaning = true
    input.value = ''
    isNUMS.value = await validateNUMS(R.value, PK.value)
    setTimeout(() => {
      isCleaning = false
    }, 0)
  }

  async function computeR(text: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    return sha256(data)
  }

  onBeforeMount(async () => {
    const url = new URL(window.location.href)
    const inputFromParams = url.searchParams.get('input')
    const rFromParams = url.searchParams.get('r')
    const pkFromParams = url.searchParams.get('pk')

    if (inputFromParams && pkFromParams) {
      input.value = inputFromParams
      R.value = await computeR(inputFromParams)
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
    isNUMS.value = await validateNUMS(R.value, PK.value)
  })

  return {
    input,
    R,
    PK,
    isNUMS,
    shouldValidateNUMS,
    generateRandom,
    generateFromInput,
    setRFromInput,
    clearText
  }
}
