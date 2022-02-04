interface Foo {}
interface Bar {}
export declare class FooC implements Foo {}
export declare class BarC implements Bar {}
type foo_d_Foo = Foo;
type foo_d_Bar = Bar;
type foo_d_FooC = FooC;
declare const foo_d_FooC: typeof FooC;
type foo_d_BarC = BarC;
declare const foo_d_BarC: typeof BarC;
declare global { namespace foo {
     export type Foo = foo_d_Foo;
    export type Bar = foo_d_Bar;
    export type FooC = foo_d_FooC;
    export const FooC: typeof foo_d_FooC;
    export type BarC = foo_d_BarC;
    export const BarC: typeof foo_d_BarC;
 
} }
