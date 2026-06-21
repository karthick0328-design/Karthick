'use client';
import FinancialReviewForm from '@/components/projects/FinancialReviewForm';
import { useParams } from 'next/navigation';

export default function BiochemistryFinancialReviewPage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <FinancialReviewForm
            serviceName="biochemistry"
            backUrl={`/manager-dashboard/service/biochemistry/project/${projectId}`}
        />
    );
}
