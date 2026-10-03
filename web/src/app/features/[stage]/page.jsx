import { notFound } from 'next/navigation'
import FeatureStagePage from '../../../components/FeatureStagePage'
import { GETGUAC_STAGES, getStage } from '../../../lib/getguac-circle'
import { getMoneyGroup } from '../../../lib/money-journey'
import MoneyGroupPage from '../../../components/MoneyGroupPage'

export function generateStaticParams() { return GETGUAC_STAGES.map(stage => ({ stage: stage.slug })) }
export function generateMetadata({ params }) {
  const group=getMoneyGroup(params.stage)
  if(group) return {title:`${group.name}: ${group.title}`,description:group.summary,alternates:{canonical:`/features/${group.slug}`}}
  const stage=getStage(params.stage)
  if(!stage) return {}
  return { title:`${stage.name}: ${stage.short}`, description:stage.summary, alternates:{canonical:`/features/${stage.slug}`} }
}
export default function StagePage({ params }) { const group=getMoneyGroup(params.stage); if(group) return <MoneyGroupPage group={group}/>; const stage=getStage(params.stage); if(!stage) notFound(); return <FeatureStagePage stage={stage}/> }
