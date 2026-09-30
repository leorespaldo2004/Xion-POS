import { useState, useEffect } from 'react';
import { configRepository } from '../database/repositories/configRepository';
import { printerService } from '../services/printer_service';
import { LocalSale, LocalSaleItem, LocalSalePayment } from '../database/repositories/saleRepository';

export function usePrinter() {
  const [printerMac, setPrinterMac] = useState<string>('');
  const [printerName, setPrinterName] = useState<string>('');
  const [autoPrint, setAutoPrint] = useState<boolean>(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const config = await configRepository.getAllConfig();
    setPrinterMac(config.printer_mac);
    setPrinterName(config.printer_name);
    setAutoPrint(config.auto_print);
  };

  const savePrinterConfig = async (mac: string, name: string, auto: boolean) => {
    await configRepository.set('printer_mac', mac);
    await configRepository.set('printer_name', name);
    await configRepository.set('auto_print', auto ? 'true' : 'false');
    setPrinterMac(mac);
    setPrinterName(name);
    setAutoPrint(auto);
  };

  const printSale = async (
    sale: LocalSale,
    items: LocalSaleItem[],
    payments: LocalSalePayment[]
  ) => {
    const receiptText = printerService.generateReceiptText(sale, items, payments);
    return await printerService.connectAndPrint(printerMac, receiptText);
  };

  return {
    printerMac,
    printerName,
    autoPrint,
    savePrinterConfig,
    printSale
  };
}
