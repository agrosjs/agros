<template>
    <pre>Greet from BarComponent, used by {{ used }}</pre>
</template>

<script lang="ts">
export default {
    props: ['used'],
};
</script>
