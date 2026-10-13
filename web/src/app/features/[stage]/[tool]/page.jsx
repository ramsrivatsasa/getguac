import { featureMetadata, featureBreadcrumbs } from '../../../../lib/public-seo.mjs'
import { notFound } from 'next/navigation'
import FeatureDetailPage from '../../../../components/FeatureDetailPage'
import { FEATURE_DETAILS, getFeatureDetail } from '../../../../lib/feature-details'
import { getMoneyGroup } from '../../../../lib/money-journey'

export function generateStaticParams(){return Object.entries(FEATURE_DETAILS).flatMap(([stage,tools])=>Object.keys(tools).map(tool=>({stage,tool})))}
export async function generateMetadata({params}){const {stage,tool}=await params;const group=getMoneyGroup(stage);const detail=getFeatureDetail(stage,tool);if(!group||!detail)return{};return featureMetadata(stage,tool,detail)}
export default async function ToolPage({params}){const {stage,tool}=await params;const group=getMoneyGroup(stage);const detail=getFeatureDetail(stage,tool);if(!group||!detail)notFound();return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(featureBreadcrumbs(group,detail,tool)).replace(/</g, "\\u003c")}}/><FeatureDetailPage group={group} detail={detail} tool={tool}/></>}
