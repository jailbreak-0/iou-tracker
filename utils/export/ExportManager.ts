/**
 * Export Module - Modular export functionality
 * This module can be detached from the main app to create a paid version
 * 
 * Features:
 * - PDF export of transaction history
 * - Excel/CSV export of data
 * - Email sharing functionality
 * - Custom report generation
 */

import { ExportFormat, IOU } from '@/types';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { hasProFeature, ProFeature } from '../pro';

// This class encapsulates all export functionality
export class ExportManager {
  private static instance: ExportManager;
  
  public static getInstance(): ExportManager {
    if (!ExportManager.instance) {
      ExportManager.instance = new ExportManager();
    }
    return ExportManager.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Check if export functionality is available
   */
  public isAvailable(): boolean {
    try {
      // Check if we have the required modules and they're working
      return !!(FileSystem && MediaLibrary && Sharing && hasProFeature(ProFeature.EXPORT));
    } catch (error) {
      console.error('Export functionality not available:', error);
      return false;
    }
  }

  /**
   * Download file to device storage automatically with minimal user intervention
   */
  private async downloadFile(fileUri: string, fileName: string, mimeType: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Web implementation - trigger automatic download
        const link = document.createElement('a');
        link.href = fileUri;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert(
          'Download Complete', 
          `${fileName} has been downloaded to your default download folder.`,
          [{ text: 'OK' }]
        );
        return true;
      }

      // For mobile platforms, save directly to device storage
      try {
        // Request media library permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant media library access to save files directly to your device.',
            [{ text: 'OK' }]
          );
          return false;
        }

        if (Platform.OS === 'android') {
          try {
            // For Android, use the Storage Access Framework (SAF) approach
            // First create the file in the public documents directory using MediaLibrary
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            
            // Try to move the asset to Downloads folder
            try {
              // Get Downloads album or create it
              let downloadsAlbum = await MediaLibrary.getAlbumAsync('Download');
              if (!downloadsAlbum) {
                // If Downloads album doesn't exist, try creating it
                try {
                  downloadsAlbum = await MediaLibrary.createAlbumAsync('Download', asset, false);
                } catch (createError) {
                  // If can't create Download album, create IOU Tracker folder in Documents
                  let iouAlbum = await MediaLibrary.getAlbumAsync('IOU Tracker');
                  if (!iouAlbum) {
                    iouAlbum = await MediaLibrary.createAlbumAsync('IOU Tracker', asset, false);
                  } else {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], iouAlbum, false);
                  }
                  
                  Alert.alert(
                    'Export Complete', 
                    `${fileName} has been saved to the 'IOU Tracker' folder in your device storage.`,
                    [{ text: 'OK' }]
                  );
                  return true;
                }
              } else {
                // Add to Downloads folder
                await MediaLibrary.addAssetsToAlbumAsync([asset], downloadsAlbum, false);
              }
              
              Alert.alert(
                'Export Complete', 
                `${fileName} has been saved to your Downloads folder.`,
                [{ text: 'OK' }]
              );
              return true;
              
            } catch (albumError) {
              console.log('Failed to save to Downloads, trying alternative:', albumError);
              
              // Alternative: Try to save to a public Documents folder
              try {
                // Create IOU Tracker folder in public storage
                let iouAlbum = await MediaLibrary.getAlbumAsync('IOU Tracker');
                if (!iouAlbum) {
                  iouAlbum = await MediaLibrary.createAlbumAsync('IOU Tracker', asset, false);
                } else {
                  await MediaLibrary.addAssetsToAlbumAsync([asset], iouAlbum, false);
                }
                
                Alert.alert(
                  'Export Complete', 
                  `${fileName} has been saved to the 'IOU Tracker' folder in your device storage. You can find it in your file manager.`,
                  [{ text: 'OK' }]
                );
                return true;
              } catch (fallbackError) {
                // Last resort: file is saved to media library but location may vary
                Alert.alert(
                  'Export Complete', 
                  `${fileName} has been saved to your device. Check your file manager or gallery app to locate the file.`,
                  [{ text: 'OK' }]
                );
                return true;
              }
            }
            
          } catch (androidError) {
            console.error('Android-specific save failed:', androidError);
            throw androidError;
          }
        } else {
          // iOS implementation
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          
          let albumName = 'IOU Tracker Exports';
          try {
            // Check if album exists
            let album = await MediaLibrary.getAlbumAsync(albumName);
            if (!album) {
              // Create album if it doesn't exist
              album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
            } else {
              // Add to existing album
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            }
            
            Alert.alert(
              'Export Complete', 
              `${fileName} has been saved to the '${albumName}' album in your Photos app.`,
              [{ text: 'OK' }]
            );
          } catch (albumError) {
            // If album creation fails, file is still saved to media library
            console.log('Album creation failed, but file saved:', albumError);
            Alert.alert(
              'Export Complete', 
              `${fileName} has been saved to your Photos library.`,
              [{ text: 'OK' }]
            );
          }
        }
        
        return true;
      } catch (mediaError) {
        console.error('MediaLibrary save failed:', mediaError);
        
        // Fallback: Use Expo Sharing as a last resort
        try {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(fileUri, {
              mimeType: mimeType,
              dialogTitle: `Save ${fileName}`,
              UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.html'
            });
            
            Alert.alert(
              'File Ready', 
              `${fileName} is ready. Please use the share menu to save it to your preferred location (Downloads, Files, etc.).`,
              [{ text: 'OK' }]
            );
            return true;
          } else {
            throw new Error('Sharing not available');
          }
        } catch (shareError) {
          // Final fallback: Notify user file is in app directory
          Alert.alert(
            'File Created', 
            `${fileName} has been created. The file is available in the app's storage. Please check your device's file manager or contact support for assistance accessing the file.`,
            [{ text: 'OK' }]
          );
          return true;
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert('Export Failed', 'Could not save the file. Please try again or check your device permissions.');
      return false;
    }
  }

  /**
   * Main export function - handles both PDF and CSV formats
   * (Pro Feature)
   */
  async exportTransactions(
    ious: IOU[], 
    format: ExportFormat = 'pdf',
    summary?: { totalLent: number; totalBorrowed: number; netBalance: number }
  ): Promise<boolean> {
    // Check Pro feature access
    if (!hasProFeature(ProFeature.EXPORT)) {
      Alert.alert('Feature Available', 'Export feature is included in this version!');
      // Continue anyway since all features are available in unified version
    }

    try {
      if (format === 'pdf') {
        return await this.exportToPDF(ious, summary);
      } else {
        return await this.exportToExcel(ious);
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'Could not export data. Please try again.');
      return false;
    }
  }

  /**
   * Export to PDF format (HTML-based)
   */
  private async exportToPDF(
    ious: IOU[], 
    summary?: { totalLent: number; totalBorrowed: number; netBalance: number }
  ): Promise<boolean> {
    try {
      const htmlContent = this.generateHTMLContent(ious, summary);
      
      // For now, we'll create a simple HTML file
      // In a full implementation, you'd use a library like react-native-html-to-pdf
      const fileName = `iou_report_${format(new Date(), 'yyyy-MM-dd')}.html`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, htmlContent);
      
      return await this.downloadFile(fileUri, fileName, 'text/html');
    } catch (error) {
      console.error('PDF export failed:', error);
      return false;
    }
  }

  /**
   * Export to Excel/CSV format
   */
  private async exportToExcel(ious: IOU[]): Promise<boolean> {
    try {
      const csvContent = this.generateCSVContent(ious);
      const fileName = `iou_data_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      return await this.downloadFile(fileUri, fileName, 'text/csv');
    } catch (error) {
      console.error('Excel export failed:', error);
      return false;
    }
  }

  /**
   * Generate HTML content for PDF export
   */
  private generateHTMLContent(
    ious: IOU[], 
    summary?: { totalLent: number; totalBorrowed: number; netBalance: number }
  ): string {
    const currentDate = format(new Date(), 'MMMM dd, yyyy');
    
    const summarySection = summary ? `
      <div class="summary">
        <h2>Financial Summary</h2>
        <div class="summary-item">
          <strong>Total Lent:</strong> $${summary.totalLent.toFixed(2)}
        </div>
        <div class="summary-item">
          <strong>Total Borrowed:</strong> $${summary.totalBorrowed.toFixed(2)}
        </div>
        <div class="summary-item net-balance">
          <strong>Net Balance:</strong> $${summary.netBalance.toFixed(2)}
        </div>
      </div>
    ` : '';

    const transactionsHtml = ious.map(iou => `
      <tr class="${iou.type}">
        <td>${iou.personName}</td>
        <td class="amount">$${iou.amount.toFixed(2)}</td>
        <td class="type ${iou.type}">${iou.type === 'lent' ? 'Lent' : 'Borrowed'}</td>
        <td>${format(new Date(iou.date), 'MM/dd/yyyy')}</td>
        <td>${iou.dueDate ? format(new Date(iou.dueDate), 'MM/dd/yyyy') : '-'}</td>
        <td class="status ${iou.isSettled ? 'settled' : 'active'}">
          ${iou.isSettled ? 'Settled' : 'Active'}
        </td>
        <td>${iou.note || '-'}</td>
      </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>IOU Report - ${currentDate}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
          line-height: 1.6;
          color: #333;
        }
        .header { 
          text-align: center; 
          margin-bottom: 40px; 
          border-bottom: 2px solid #007AFF;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #007AFF;
          margin: 0;
        }
        .summary {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .summary h2 {
          margin-top: 0;
          color: #007AFF;
        }
        .summary-item {
          margin: 10px 0;
          font-size: 16px;
        }
        .net-balance {
          border-top: 1px solid #ddd;
          padding-top: 10px;
          font-size: 18px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th, td { 
          padding: 12px; 
          text-align: left; 
          border-bottom: 1px solid #ddd;
        }
        th { 
          background-color: #007AFF; 
          color: white;
          font-weight: bold;
        }
        .amount { 
          text-align: right; 
          font-weight: bold;
        }
        .lent { 
          color: #34C759;
        }
        .borrowed { 
          color: #FF3B30;
        }
        .type.lent {
          background-color: #E8F5E8;
          color: #2D7D32;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        .type.borrowed {
          background-color: #FFEBEE;
          color: #C62828;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        .status.active {
          color: #FF9500;
          font-weight: bold;
        }
        .status.settled {
          color: #34C759;
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        tr:hover {
          background-color: #f8f9fa;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>IOU Transaction Report</h1>
        <p>Generated on ${currentDate}</p>
      </div>
      
      ${summarySection}
      
      <h2>Transaction Details</h2>
      <table>
        <thead>
          <tr>
            <th>Person</th>
            <th>Amount</th>
            <th>Type</th>
            <th>Date</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${transactionsHtml}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Total Transactions: ${ious.length} | Report generated by IOU Tracker</p>
      </div>
    </body>
    </html>`;
  }

  /**
   * Generate CSV content for Excel export
   */
  private generateCSVContent(ious: IOU[]): string {
    const headers = ['Person Name', 'Amount', 'Type', 'Date', 'Due Date', 'Status', 'Notes', 'Created', 'Settled Date'];
    const headerRow = headers.join(',');
    
    const dataRows = ious.map(iou => {
      const row = [
        `"${iou.personName}"`,
        iou.amount.toFixed(2),
        iou.type,
        format(new Date(iou.date), 'yyyy-MM-dd'),
        iou.dueDate ? format(new Date(iou.dueDate), 'yyyy-MM-dd') : '',
        iou.isSettled ? 'Settled' : 'Active',
        `"${iou.note || ''}"`,
        format(new Date(iou.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        iou.settledDate ? format(new Date(iou.settledDate), 'yyyy-MM-dd') : ''
      ];
      return row.join(',');
    });
    
    return [headerRow, ...dataRows].join('\n');
  }
}

// Export convenience functions
export const exportToCSV = async (ious: IOU[]): Promise<boolean> => {
  const manager = ExportManager.getInstance();
  return await manager.exportTransactions(ious, 'csv');
};

export const exportToPDF = async (
  ious: IOU[], 
  summary?: { totalLent: number; totalBorrowed: number; netBalance: number }
): Promise<boolean> => {
  const manager = ExportManager.getInstance();
  return await manager.exportTransactions(ious, 'pdf', summary);
};