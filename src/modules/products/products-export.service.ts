import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import * as ExcelJS from 'exceljs';
const PDFDocument = require('pdfkit');
import * as express from 'express';

@Injectable()
export class ProductsExportService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async exportToExcel(res: express.Response) {
    const products = await this.productRepo.find({
      relations: ['category', 'supplier'],
      order: { name: 'ASC' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Produits');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Nom', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Code-Barres', key: 'barcode', width: 20 },
      { header: 'Prix de Vente', key: 'price', width: 15 },
      { header: 'Prix d\'Achat', key: 'costPrice', width: 15 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Catégorie', key: 'category', width: 20 },
      { header: 'Fournisseur', key: 'supplier', width: 20 },
      { header: 'Statut', key: 'status', width: 10 },
    ];

    products.forEach((p) => {
      worksheet.addRow({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode || 'N/A',
        price: p.price,
        costPrice: p.costPrice || 0,
        stock: p.stock,
        category: p.category?.name || 'N/A',
        supplier: p.supplier?.name || 'N/A',
        status: p.isActive ? 'Actif' : 'Inactif',
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=inventaire_produits.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  async exportToPdf(res: express.Response) {
    const products = await this.productRepo.find({
      relations: ['category'],
      order: { name: 'ASC' },
    });

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=catalogue_produits.pdf',
    );

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('INVENTAIRE DES PRODUITS', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown();

    // Table Header
    const tableTop = 150;
    const colWidths = [200, 80, 80, 60, 70];
    const columns = ['Nom du Produit', 'SKU', 'Catégorie', 'Stock', 'Prix (CFA)'];

    doc.fontSize(10).font('Helvetica-Bold');
    let x = 30;
    columns.forEach((col, i) => {
      doc.text(col, x, tableTop);
      x += colWidths[i];
    });

    doc.moveTo(30, tableTop + 15).lineTo(565, tableTop + 15).stroke();

    // Rows
    let y = tableTop + 25;
    doc.font('Helvetica');

    products.forEach((p) => {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      doc.text(p.name.substring(0, 35), 30, y);
      doc.text(p.sku.substring(0, 15), 30 + colWidths[0], y);
      doc.text((p.category?.name || 'N/A').substring(0, 15), 30 + colWidths[0] + colWidths[1], y);
      doc.text(p.stock.toString(), 30 + colWidths[0] + colWidths[1] + colWidths[2], y);
      doc.text(p.price.toLocaleString(), 30 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y);

      y += 20;
    });

    doc.end();
  }
}
