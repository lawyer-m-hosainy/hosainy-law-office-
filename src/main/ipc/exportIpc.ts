import { ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { DataDirService } from '../services/DataDirService';
import { ExportTableDataInput, ExportResult } from '../../shared/types';

export function registerExportIpc(): void {
  const dataDirService = DataDirService.getInstance();

  ipcMain.handle('export:tableData', async (_, input: ExportTableDataInput): Promise<ExportResult> => {
    try {
      const exportsDir = dataDirService.getExportsPath();
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      const safeBaseName = (input.fileName || 'export')
        .replace(/[\\/:*?"<>|]/g, '_')
        .trim();
      const timestamp = new Date().toISOString().slice(0, 10);

      if (input.format === 'csv') {
        // Generate UTF-8 CSV with BOM (\uFEFF)
        const csvLines: string[] = [];

        // Headers
        const headerLine = input.headers
          .map(h => escapeCsvCell(h))
          .join(',');
        csvLines.push(headerLine);

        // Rows
        for (const row of input.rows) {
          const rowLine = row
            .map(cell => escapeCsvCell(cell))
            .join(',');
          csvLines.push(rowLine);
        }

        const csvContent = '\uFEFF' + csvLines.join('\r\n');
        const fileName = `${safeBaseName}_${timestamp}.csv`;
        const targetPath = path.join(exportsDir, fileName);

        fs.writeFileSync(targetPath, csvContent, 'utf-8');

        return {
          success: true,
          filePath: targetPath,
        };
      } else {
        // Generate Excel XML Spreadsheet 2003 (.xls) with native RTL support and styled headers
        const fileName = `${safeBaseName}_${timestamp}.xls`;
        const targetPath = path.join(exportsDir, fileName);

        const xmlContent = generateExcelXml({
          title: input.title,
          headers: input.headers,
          rows: input.rows,
        });

        fs.writeFileSync(targetPath, xmlContent, 'utf-8');

        return {
          success: true,
          filePath: targetPath,
        };
      }
    } catch (err: any) {
      console.error('Error exporting table data:', err);
      return {
        success: false,
        error: err?.message || 'فشل تصدير البيانات',
      };
    }
  });

  // Open the exported file in Excel / Default Spreadsheet App
  ipcMain.handle('export:openFile', async (_, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'الملف غير موجود بالمسار المحدد' };
      }
      const err = await shell.openPath(filePath);
      if (err) {
        return { success: false, error: err };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  });
}

function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // If string contains comma, double-quote, or newline, wrap in quotes and escape internal quotes
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function escapeXml(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateExcelXml(params: {
  title: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}): string {
  const { title, headers, rows } = params;

  let rowsXml = '';

  // Title Row
  rowsXml += `
    <Row ss:Height="28">
      <Cell ss:MergeAcross="${headers.length - 1}" ss:StyleID="TitleStyle">
        <Data ss:Type="String">${escapeXml(title)}</Data>
      </Cell>
    </Row>
    <Row ss:Height="8" />
  `;

  // Headers Row
  rowsXml += '<Row ss:Height="24">';
  for (const h of headers) {
    rowsXml += `
      <Cell ss:StyleID="HeaderStyle">
        <Data ss:Type="String">${escapeXml(h)}</Data>
      </Cell>
    `;
  }
  rowsXml += '</Row>';

  // Data Rows
  for (const row of rows) {
    rowsXml += '<Row ss:Height="20">';
    for (const cell of row) {
      const isNum = typeof cell === 'number' && !isNaN(cell);
      const cellType = isNum ? 'Number' : 'String';
      const cellValue = isNum ? cell : (cell !== null && cell !== undefined ? String(cell) : '-');

      rowsXml += `
        <Cell ss:StyleID="${isNum ? 'NumberStyle' : 'DataStyle'}">
          <Data ss:Type="${cellType}">${escapeXml(cellValue)}</Data>
        </Cell>
      `;
    }
    rowsXml += '</Row>';
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Font ss:FontName="Segoe UI" ss:Size="14" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#D97706" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataStyle">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="NumberStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#0F172A" ss:Bold="1"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="البيانات" ss:RightToLeft="1">
  <Table ss:DefaultColumnWidth="120" ss:DefaultRowHeight="20">
   ${rowsXml}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <DisplayRightToLeft/>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
}
