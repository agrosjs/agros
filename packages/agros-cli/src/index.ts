// export const _THIS_WILL_BE_REMOVED = null;
import inquirer from 'inquirer';

inquirer.prompt([
    {
        name: 'name',
        message: 'fuck1',
    },
    {
        name: 'module',
        message: 'fuck1',
        default: (data) => {
            console.log(data);
            return data;
        },
    },
]);
