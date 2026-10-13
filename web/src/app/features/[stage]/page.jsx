import { groupMetadata } from '../../../lib/public-seo.mjs'
import { notFound } from 'next/navigation'
import FeatureStagePage from '../../../components/FeatureStagePage'
import { GETGUAC_STAGES, getStage } from '../../../lib/getguac-circle'
import { getMoneyGroup } from '../../../lib/money-journey'
import MoneyGroupPage from '../../../components/MoneyGroupPage'

export function generateStaticParams() { return GETGUAC_STAGES.map(stage => ({ stage: stage.slug })) }
export async function generateMetadata({ params }) {
  const {stage:slug}=await params
  const group=getMoneyGroup(slug)
  if(group) return groupMetadata(group)
  const stage=getStage(slug)
  if(!stage) return {}
  return { title:`${stage.name}: ${stage.short}`, description:stage.summary, alternates:{canonical:`/features/${stage.slug}`} }
}
export default async function StagePage({ params }) { const {stage:slug}=await params; const group=getMoneyGroup(slug); if(group) return <MoneyGroupPage group={group}/>; const stage=getStage(slug); if(!stage) notFound(); return <FeatureStagePage stage={stage}/> }
