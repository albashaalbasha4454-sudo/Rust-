import React from 'react';
import type { Product, Modifier, Customer, InvoiceItem } from '../types';
import POSViewFinal from './POSViewFinal';

interface POSViewProps {
  products: Product[];
  modifiers: Modifier[];
  customers: Customer[];
  onCompleteSale: (items: InvoiceItem[], customerInfo?: any) => void;
  onCreateDeliveryOrder: (cart: InvoiceItem[], customerInfo: any, deliveryFee: number, source: any) => void;
  onCreateReservation: (cart: InvoiceItem[], customerInfo: any) => void;
}

const POSView: React.FC<POSViewProps> = (props) => {
  return <POSViewFinal {...props} departments={[]} />;
};

export default POSView;
