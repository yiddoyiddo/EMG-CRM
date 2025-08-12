import { NextRequest, NextResponse } from 'next/server';
import { SecurityService, withSecurity } from '@/lib/security';
import { DataExportService, ExportRequest } from '@/lib/export-service';
import { Resource, Action } from '@prisma/client';

export async function POST(req: NextRequest) {
  return withSecurity(Resource.REPORTS, Action.EXPORT, async (context) => {
    const body = await req.json();
    
    // Validate export request
    const exportRequest: ExportRequest = {
      resource: body.resource,
      format: body.format || 'csv',
      filters: body.filters || {},
      fields: body.fields,
      dateRange: body.dateRange ? {
        start: new Date(body.dateRange.start),
        end: new Date(body.dateRange.end)
      } : undefined
    };

    // Check if export is allowed
    const { allowed, reason } = await DataExportService.canExport(context, exportRequest);
    if (!allowed) {
      await SecurityService.logAction({
        action: 'EXPORT',
        resource: exportRequest.resource,
        success: false,
        errorMsg: reason,
        details: exportRequest
      }, req);
      
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    try {
      // Execute export
      const result = await DataExportService.executeExport(context, exportRequest);
      
      // Convert to appropriate format
      let responseData;
      let contentType;
      let filename;

      switch (exportRequest.format) {
        case 'csv':
          responseData = convertToCSV(result.data);
          contentType = 'text/csv';
          filename = `${exportRequest.resource.toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'json':
          responseData = JSON.stringify(result.data, null, 2);
          contentType = 'application/json';
          filename = `${exportRequest.resource.toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.json`;
          break;
        default:
          return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
      }

      // Log successful export
      await SecurityService.logAction({
        action: 'EXPORT',
        resource: exportRequest.resource,
        success: true,
        details: {
          format: exportRequest.format,
          recordCount: result.data.length,
          filters: exportRequest.filters
        }
      }, req);

      // Return file as download
      return new NextResponse(responseData, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Export-Metadata': JSON.stringify(result.metadata)
        },
      });
    } catch (error) {
      await SecurityService.logAction({
        action: 'EXPORT',
        resource: exportRequest.resource,
        success: false,
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
        details: exportRequest
      }, req);

      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Export failed' 
      }, { status: 500 });
    }
  }, req);
}

export async function GET(req: NextRequest) {
  return withSecurity(Resource.REPORTS, Action.READ, async (context) => {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'history') {
      const days = parseInt(searchParams.get('days') || '30');
      const history = await DataExportService.getExportHistory(context.userId, days);
      return NextResponse.json({ history });
    }

    if (action === 'restrictions') {
      const resource = searchParams.get('resource') as Resource;
      if (!resource) {
        return NextResponse.json({ error: 'Resource parameter required' }, { status: 400 });
      }

      const mockRequest: ExportRequest = {
        resource,
        format: 'csv',
        filters: {}
      };

      const { allowed, restrictions, reason } = await DataExportService.canExport(context, mockRequest);
      return NextResponse.json({ 
        allowed, 
        restrictions: restrictions || null, 
        reason: reason || null 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }, req);
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle nested objects and arrays
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value || '');
        // Escape commas and quotes
        return stringValue.includes(',') || stringValue.includes('"') 
          ? `"${stringValue.replace(/"/g, '""')}"` 
          : stringValue;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}