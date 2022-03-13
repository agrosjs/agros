export function Injectable(): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(
            'design:paramtypes',
            Reflect.getMetadata('design:paramtypes', target) || [],
            target,
        );
    };
}
