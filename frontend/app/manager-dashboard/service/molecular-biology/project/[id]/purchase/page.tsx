'use client';
import PurchaseForm from '@/components/projects/PurchaseForm';
import { useParams } from 'next/navigation';

export default function MolecularBiologyPurchasePage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <PurchaseForm
            serviceName="molecular-biology"
            backUrl={`/manager-dashboard/service/molecular-biology/purchase`}
        />
    );
}
