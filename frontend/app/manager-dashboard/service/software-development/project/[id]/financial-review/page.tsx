'use client';
import FinancialReviewForm from '@/components/projects/FinancialReviewForm';
import { useParams } from 'next/navigation';

export default function SoftwareDevelopmentFinancialReviewPage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <FinancialReviewForm
            serviceName="software-development"
            backUrl={`/manager-dashboard/service/software-development/project/${projectId}`}
        />
    );
}
