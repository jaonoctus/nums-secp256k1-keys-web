<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useForm } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import ShareButton from '@/components/ShareButton.vue'
import Separator from '@/components/ui/separator/Separator.vue'
import { Icon } from '@iconify/vue'
import { ref } from 'vue'
import { NUMS_METHOD } from '@/types'

const isHelperTextOpen = ref(false)

const {
  input,
  R,
  PK,
  isNUMS,
  numsMethod,
  tagInput,
  generateRandom,
  shouldValidateNUMS,
  generateFromInput,
  setRFromInput,
  clearText,
  toggleMethod
} = useForm()
</script>

<template>
  <div class="w-full flex items-center justify-center p-4">
    <Card class="w-full max-w-2xl">
      <CardHeader>
        <CardTitle> NUMS secp256k1 </CardTitle>
        <CardDescription class="text-xs">
          <p>
            If you want to force your P2TR to be script-path only, pick as internal key a "Nothing Up My Sleeve" (NUMS) point,
            i.e., a point with unknown discrete logarithm.
          </p>
          <p class="mt-3 flex justify-center">
            <Collapsible
              v-model:open="isHelperTextOpen"
              class="w-[350px] space-y-2"
            >
              <div class="flex items-center justify-center space-x-4 px-4">
                <p class="text-center">
                  <Badge v-if="numsMethod === NUMS_METHOD.UNKNOWN_DL_HIDING_KEY">
                    PK = H + r * G
                  </Badge>
                  <Badge v-else>
                    PK = TaggedHashToCurve(tag || ctr)
                  </Badge>
                </p>
                <CollapsibleTrigger as-child>
                  <Button variant="ghost" size="sm" class="w-9 p-0">
                    <Icon icon="lucide:circle-help" />
                    <span class="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent class="space-y-2">
                <div v-if="numsMethod === NUMS_METHOD.UNKNOWN_DL_HIDING_KEY" class="text-justify">
                  One example of such a point is H = lift_x(sha256(G))
                  which is constructed by taking the hash of the standard uncompressed encoding of the secp256k1 base point G as X coordinate.
                  In order to avoid leaking the information that key path spending is not possible
                  it is recommended to pick a fresh integer r in the range 0...n-1 uniformly at random and use H + rG as internal key.
                  It is possible to prove that this internal key does not have a known discrete logarithm with respect to G
                  by revealing r to a verifier who can then reconstruct how the internal key was created.
                </div>
                <div v-else class="text-justify">
                  This method creates a NUMS point by hashing a tag (string) with an incrementing counter until a valid point is found.
                  The hash is computed as sha256(tag || counter) where counter is a 4-byte little-endian integer starting at 0.
                  The resulting hash is used to derive an X coordinate for a secp256k1 point.
                  The resulting point is provably random with no known discrete logarithm.
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button
              variant="ghost"
              class="hover:bg-transparent"
              @click.prevent="isHelperTextOpen = true"
            >

            </Button>
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex justify-center mb-4">
          <div class="flex items-center space-x-2">
            <label for="nums-method" class="text-sm font-medium">NUMS Method:</label>
            <select
              id="nums-method"
              v-model="numsMethod"
              @change="toggleMethod"
              class="px-3 py-2 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option :value="NUMS_METHOD.UNKNOWN_DL_HIDING_KEY">Unknown DL-Hidding Key</option>
              <option :value="NUMS_METHOD.TAG">Tagged Hash Key</option>
            </select>
          </div>
        </div>
        <Separator />
        <div class="font-medium mb-2 mt-5">{{ numsMethod === NUMS_METHOD.UNKNOWN_DL_HIDING_KEY ? 'Text input' : 'Tag' }}:</div>
        <div class="flex w-full items-center">
          <Input
            id="text"
            type="text"
            :placeholder="numsMethod === NUMS_METHOD.UNKNOWN_DL_HIDING_KEY ? 'type some nonsense text' : 'enter tag (e.g. Labitbu)'"
            v-model="input"
            @input="setRFromInput"
          />
          <Button
            variant="ghost"
            class="m-0 mx-3 p-0 hover:bg-transparent"
            @click.prevent="generateFromInput"
          >
            <Icon icon="lucide:hash" />
          </Button>
        </div>
        <div v-if="numsMethod === NUMS_METHOD.UNKNOWN_DL_HIDING_KEY" class="font-medium mb-2 mt-5">r:</div>
        <div v-if="numsMethod === NUMS_METHOD.UNKNOWN_DL_HIDING_KEY" class="flex w-full items-center">
          <Input
            class="text-xs"
            id="R"
            type="text"
            placeholder="32-byte hex"
            v-model="R"
            @input="clearText"
          />
          <Button
            variant="ghost"
            class="m-0 mx-3 p-0 hover:bg-transparent"
            @click.prevent="generateRandom"
          >
            <Icon icon="lucide:refresh-cw" />
          </Button>
        </div>
        <div class="font-medium mb-2 mt-5">PK:</div>
        <div class="flex w-full items-center">
          <Input
            class="text-xs"
            id="pk"
            type="text"
            placeholder="secp256k1 public key"
            v-model="PK"
          />
        </div>
        <div v-if="shouldValidateNUMS" class="mt-5">
          <div v-if="isNUMS" class="text-green-500 flex items-center justify-center">
            <Icon icon="lucide:badge-check" class="mx-2 text-xl" />
            <span>Nothing Up My Sleeve!</span>
          </div>
          <div v-else class="text-red-500 flex items-center justify-center">
            <Icon icon="lucide:badge-alert" class="mx-2 text-xl" />
            <span>Don't trust them. LIAR!</span>
          </div>
        </div>
      </CardContent>
      <CardFooter class="flex justify-center px-6 pb-6">
        <ShareButton :form="{ input, R, PK, method: numsMethod, tag: tagInput }" />
      </CardFooter>
    </Card>
  </div>
</template>
