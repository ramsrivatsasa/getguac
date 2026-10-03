import { notFound } from 'next/navigation'
import FeatureDetailPage from '../../../../components/FeatureDetailPage'
import { FEATURE_DETAILS, getFeatureDetail } from '../../../../lib/feature-details'
import { getMoneyGroup } from '../../../../lib/money-journey'

export function generateStaticParams(){return Object.entries(FEATURE_DETAILS).flatMap(([stage,tools])=>Object.keys(tools).map(tool=>({stage,tool})))}
export function generateMetadata({params}){const group=getMoneyGroup(params.stage);const detail=getFeatureDetail(params.stage,params.tool);if(!group||!detail)return{};return{title:`${detail.name} | GetGuac ${group.name}`,description:detail.summary,alternates:{canonical:`/features/${params.stage}/${params.tool}`}}}
export default function ToolPage({params}){const group=getMoneyGroup(params.stage);const detail=getFeatureDetail(params.stage,params.tool);if(!group||!detail)notFound();return <FeatureDetailPage group={group} detail={detail}/>}
