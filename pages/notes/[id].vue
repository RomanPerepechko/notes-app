<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <section>
    <h1>Заметка {{ route.params.id }}</h1>
    <NuxtLink to="/">К списку</NuxtLink>
  </section>
</template>
