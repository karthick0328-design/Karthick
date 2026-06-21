'use client';
import FinancialReviewForm from '@/components/projects/FinancialReviewForm';
import { useParams } from 'next/navigation';

export default function NGSFinancialReviewPage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <FinancialReviewForm
            serviceName="ngs"
            backUrl={`/manager-dashboard/service/ngs/project/${projectId}`}
        />
    );
}
