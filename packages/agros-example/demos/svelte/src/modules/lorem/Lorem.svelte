<script lang="ts">
import { getContainer } from '@agros/app';
import { LoremService } from './lorem.service';

const container = getContainer();
const loremService = container.get<LoremService>(LoremService);
loremService.sayHello();
</script>

<div>Welcome to Lorem page!</div>
