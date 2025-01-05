<script setup lang="ts">
import type { NUMS } from '@/types'
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

  if (props.form.input !== '') {
    url.searchParams.set('input', props.form.input)
  } else if (props.form.R !== '') {
    url.searchParams.set('r', props.form.R)
  }

  return url
})

const isDisabled = computed(
  () => isSupported && !(props.form.PK === '' || props.form.R === ''),
)

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
