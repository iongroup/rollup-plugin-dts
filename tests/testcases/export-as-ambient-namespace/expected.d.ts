interface Foo$1 {}
interface Bar {}
declare class FooC implements Foo$1 {}
declare class BarC implements Bar {}
type foo_d_Bar = Bar;
type foo_d_BarC = BarC;
declare const foo_d_BarC: typeof BarC;
type foo_d_FooC = FooC;
declare const foo_d_FooC: typeof FooC;
declare global { namespace foo {
     export type Bar = foo_d_Bar;
    export type BarC = foo_d_BarC;
    export const BarC: typeof foo_d_BarC;
    export type Foo = Foo$1;
    export type FooC = foo_d_FooC;
    export const FooC: typeof foo_d_FooC;
 
} }
// Same name in foo
interface Foo {}
type bar_d_Foo = Foo;
declare global { namespace bar {
     export type Foo = bar_d_Foo;
 
} }
export {  }
