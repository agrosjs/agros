<template>
    <div>Agros is working!</div>
    <Bar used="foo.module.ts" />
    <router-view></router-view>
</template>

<script lang="ts">
import { getContainer } from "@agros/app";
import { BarComponent } from "../bar/bar.component";
import { BarService } from "../bar/bar.service";
import { FooService } from "./foo.service";

const Foo = {
    mounted() {
        const container = getContainer(Foo);
        const fooService = container.get<FooService>(FooService);
        const barService = container.get<BarService>(BarService);
        fooService.logHello();
        barService.sayHello();
    },
} as any;

const container = getContainer(Foo);
const Bar = container.get<any>(BarComponent);

Foo.components = {
    Bar,
};

export default Foo;
</script>
