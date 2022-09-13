<script>
import { getContainer } from '@agros/app';
import { BarComponent } from '../bar/bar.component';
import { BarService } from '../bar/bar.service';
import { FooService } from './foo.service';
import { RouterOutlet } from '@agros/platform-svelte/lib/svelte-router';

const container = getContainer();
const fooService = container.get<FooService>(FooService);
const barService = container.get<BarService>(BarService);
fooService.logHello();
barService.sayHello();
</script>

<div>
    <div>Agros is working!</div>
    <svelte:component this={container.get(BarComponent)} used="foo.module.ts" />
    <RouterOutlet />
</div>
