<template>
    <div>Welcome to Lorem page!</div>
</template>

<script>
import { getContainer } from '@agros/app';
import { LoremService } from './lorem.service';

export default {
    mounted() {
        const container = getContainer();
        const loremService = container.get<LoremService>(LoremService);
        loremService.sayHello();
    }
};
</script>
