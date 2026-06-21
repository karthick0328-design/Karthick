'use client';
import NewPurchaseRequestForm from '@/components/projects/NewPurchaseRequestForm';
import { usePathname } from 'next/navigation';

export default function MicrobiologyNewPurchasePage() {
    const pathname = usePathname();
    const backUrl = pathname.split('/').slice(0, 7).join('/');

    return (
        <NewPurchaseRequestForm
            serviceName="microbiology"
            serviceLabel="Microbiology"
            backUrl={backUrl}
        />
    );
}
