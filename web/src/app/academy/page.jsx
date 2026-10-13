import {permanentRedirect} from 'next/navigation'

// One canonical lesson index; preserve /academy as the familiar entry point.
export default function AcademyPage(){permanentRedirect('/academy/lessons')}
