'use client';
import FinancialReviewForm from '@/components/projects/FinancialReviewForm';
import { useParams } from 'next/navigation';

export default function MicrobiologyFinancialReviewPage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <FinancialReviewForm
            serviceName="microbiology"
            backUrl={`/manager-dashboard/service/microbiology/project/${projectId}`}
        />
    );
}
