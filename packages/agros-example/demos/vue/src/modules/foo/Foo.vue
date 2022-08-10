<template>
    <div>Agros is working!</div>
    <!-- <Bar used="foo.module.ts"></Bar> -->
    <router-view></router-view>
</template>

<script>
import { getContainer } from "@agros/app";
import { BarComponent } from "../bar/bar.component";
import { BarService } from "../bar/bar.service";
import { FooService } from "./foo.service";

const Foo = {
    mounted() {
        // const container = getContainer(Foo);
        // const fooService = container.get<FooService>(FooService);
        // const barService = container.get<BarService>(BarService);
        // fooService.logHello();
        // barService.sayHello();
    },
};

// const container = getContainer(Foo);
// const Bar = container.get<any>(BarComponent);

// Foo.components = {
//     Bar,
// };

export default Foo;
</script>
