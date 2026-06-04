// Barrel for the animation primitives. Import like:
//   import { CountUp, FadeUpStagger, TapScale } from '@/components/animated'
//
// Keeping this file flat (one export per primitive, no nesting) makes
// it easy for new contributors to find what's already available
// before they reach for Framer Motion or write a one-off CSS transition.
export { default as CountUp }       from './CountUp'
export { default as FadeUpStagger } from './FadeUpStagger'
export { default as TapScale }      from './TapScale'
export { default as ShimmerBox }    from './ShimmerBox'
export { default as SlideUp }       from './SlideUp'
export { default as PulseRing }     from './PulseRing'
export { default as SuccessPop }    from './SuccessPop'
export { default as ShakeOnError }  from './ShakeOnError'
