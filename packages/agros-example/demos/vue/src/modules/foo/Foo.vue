<template>
    <div>
        <div>Agros is working!</div>
        <Bar used="foo.module.ts" />
        <router-view></router-view>
    </div>
</template>

<script lang="ts">
import { getContainer } from '@agros/app';
import { BarComponent } from '../bar/bar.component';
import { BarService } from '../bar/bar.service';
import { FooService } from './foo.service';

export default {
    created() {
        const container = getContainer();
        const fooService = container.get<FooService>(FooService);
        const barService = container.get<BarService>(BarService);
        fooService.logHello();
        barService.sayHello();
        this.$options.components = {
            Bar: container.get(BarComponent),
        };
    },
};
</script>
