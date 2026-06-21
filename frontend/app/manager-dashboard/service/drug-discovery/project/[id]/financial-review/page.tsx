'use client';
import FinancialReviewForm from '@/components/projects/FinancialReviewForm';
import { useParams } from 'next/navigation';

export default function DrugDiscoveryFinancialReviewPage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <FinancialReviewForm
            serviceName="drug-discovery"
            backUrl={`/manager-dashboard/service/drug-discovery/project/${projectId}`}
        />
    );
}
