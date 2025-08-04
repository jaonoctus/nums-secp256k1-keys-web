<script setup lang="ts">
import type { NUMS } from '@/types'
import { NUMS_METHOD } from '@/types'
import { computed } from 'vue'

import { Icon } from '@iconify/vue'
import { useShare } from '@vueuse/core'

import { Button } from '@/components/ui/button'

const props = defineProps<{
  form: NUMS
}>()

const { share, isSupported } = useShare()

const link = computed(() => {
  const url = new URL(window.location.href)

  if (props.form.PK !== '') {
    url.searchParams.set('pk', props.form.PK)
  }

  if (props.form.method) {
    url.searchParams.set('method', props.form.method)
  }

  // For tag method, only include input (which is the tag value)
  // For liftX method, include input or R
  if (props.form.input !== '') {
    url.searchParams.set('input', props.form.input)
  } else if (props.form.method === NUMS_METHOD.UNKNOWN_DL_HIDING_KEY && props.form.R !== '') {
    url.searchParams.set('r', props.form.R)
  }

  return url
})

const isDisabled = computed(() => {
  if (!isSupported || props.form.PK === '') {
    return false
  }

  // For tag method, only need PK and input (which is the tag)
  if (props.form.method === NUMS_METHOD.TAG) {
    return props.form.input !== ''
  }

  // For liftX method, need PK and either input or R
  return props.form.input !== '' || props.form.R !== ''
})

function startShare() {
  share({
    title: 'NUMS secp256k1 public key',
    url: link.value.toString(),
  })
}
</script>

<template>
  <Button v-if="isDisabled" @click.prevent="startShare" variant="secondary">
    <Icon icon="lucide:share-2" /> Share
  </Button>
</template>
