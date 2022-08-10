<template>
    <div>Welcome to Lorem page!</div>
</template>

<script>
import { getContainer } from '@agros/app';
import { LoremService } from './lorem.service';

const Lorem = {
    mounted() {
        const container = getContainer(Lorem);
        const loremService = container.get<LoremService>(LoremService);
        loremService.sayHello();
    }
};

export default Lorem;
</script>
