export function utilityGuidance(title='') {
  if(/natural gas|gas bill/i.test(title))return {source:'U.S. Department of Energy',url:'https://www.energy.gov/energysaver/home-heating-systems',unit:'therms or cubic feet',steps:[{id:'usage',text:'Compare gas use and billing days with the previous statement.'},{id:'drafts',text:'Check doors and windows for drafts and consider suitable weatherstripping.'},{id:'service',text:'Follow manufacturer guidance for heating-system maintenance; use a qualified professional for gas equipment.'}]}
  const water=/water|sewer/i.test(title)
  return water?{
    source:'EPA WaterSense',url:'https://www.epa.gov/watersense/start-saving',unit:'gallons or cubic feet',
    steps:[{id:'leaks',text:'Check faucets and toilets for leaks; arrange repairs for any you find.'},{id:'tap',text:'Turn off the tap while brushing teeth.'},{id:'loads',text:'Run full laundry and dishwasher loads, following appliance instructions.'}],
  }:{
    source:'U.S. Department of Energy',url:'https://www.energy.gov/sites/default/files/2022-08/energy-saver-guide-2022.pdf',unit:'kWh',
    steps:[{id:'lights',text:'Switch off unnecessary lights when leaving a room.'},{id:'laundry',text:'Use cold-water laundry settings when appropriate for the fabric and cleaning needs.'},{id:'led',text:'When a bulb needs replacing, compare an LED with the same brightness and a suitable fixture rating.'}],
  }
}
