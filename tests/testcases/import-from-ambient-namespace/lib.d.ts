// This will enable the ES-module support for this file. If an empty `export { }` is used, tsc will not compile anymore
import os from 'os';

interface Foo {}
declare class FooC implements Foo {}
type foo_d_FooC = FooC;
declare const foo_d_FooC: typeof FooC;
type foo_d_Foo = Foo;

declare const fi: () => Foo;
declare const fc: () => FooC;
declare const index_d$1_fi: typeof fi;
declare const index_d$1_fc: typeof fc;

declare global { 
    namespace foo {
        export type Foo = foo_d_Foo;
        export type FooC = foo_d_FooC;
        export const fi: typeof index_d$1_fi;
        export const fc: typeof index_d$1_fc;
    }
}
