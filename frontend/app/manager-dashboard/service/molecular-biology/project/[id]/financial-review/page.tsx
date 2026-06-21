'use client';
import FinancialReviewForm from '@/components/projects/FinancialReviewForm';
import { useParams } from 'next/navigation';

export default function MolecularBiologyFinancialReviewPage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <FinancialReviewForm
            serviceName="molecular-biology"
            backUrl={`/manager-dashboard/service/molecular-biology/project/${projectId}`}
        />
    );
}
