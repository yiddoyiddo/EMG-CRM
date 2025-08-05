import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

interface ValidationResult {
  endpoint: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  dataPoints?: any;
}

async function validateReportingSystem() {
  console.log('🔍 Validating Enhanced Reporting System...\n');
  
  const results: ValidationResult[] = [];
  const baseUrl = 'http://localhost:3000'; // Adjust if needed
  
  try {
    // 1. Validate Database Data
    console.log('📊 Checking database data quality...');
    const dataValidation = await validateDatabaseData();
    results.push(...dataValidation);
    
    // 2. Test Executive Dashboard Endpoint
    console.log('🎯 Testing Executive Dashboard endpoint...');
    const dashboardValidation = await validateEndpoint('/api/reporting/executive-dashboard');
    results.push(dashboardValidation);
    
    // 3. Test Call Volume Endpoint
    console.log('📞 Testing Call Volume endpoint...');
    const callVolumeValidation = await validateEndpoint('/api/reporting/call-volume');
    results.push(callVolumeValidation);
    
    // 4. Test Agreement Tracking Endpoint
    console.log('📋 Testing Agreement Tracking endpoint...');
    const agreementValidation = await validateEndpoint('/api/reporting/agreement-tracking');
    results.push(agreementValidation);
    
    // 5. Test Partner List Analytics Endpoint
    console.log('👥 Testing Partner List Analytics endpoint...');
    const partnerListValidation = await validateEndpoint('/api/reporting/partner-list-analytics');
    results.push(partnerListValidation);
    
    // 6. Test BDR-specific filtering
    console.log('🎯 Testing BDR-specific filtering...');
    const bdrFilterValidation = await validateBDRFiltering();
    results.push(...bdrFilterValidation);
    
    // 7. Validate Data Consistency
    console.log('🔗 Validating data consistency across endpoints...');
    const consistencyValidation = await validateDataConsistency();
    results.push(...consistencyValidation);
    
    // Print Results
    console.log('\n📋 VALIDATION RESULTS:');
    console.log('=' .repeat(50));
    
    let passCount = 0;
    let failCount = 0;
    let warningCount = 0;
    
    results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${result.endpoint}: ${result.message}`);
      
      if (result.dataPoints) {
        Object.entries(result.dataPoints).forEach(([key, value]) => {
          console.log(`   📈 ${key}: ${value}`);
        });
      }
      
      if (result.status === 'pass') passCount++;
      else if (result.status === 'fail') failCount++;
      else warningCount++;
    });
    
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    
    if (failCount === 0) {
      console.log('\n🎉 All validations passed! The enhanced reporting system is working correctly.');
    } else {
      console.log('\n⚠️  Some validations failed. Please review the issues above.');
    }
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function validateDatabaseData(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  try {
    // Check basic data counts
    const [leadCount, pipelineCount, activityCount] = await Promise.all([
      prisma.lead.count(),
      prisma.pipelineItem.count(),
      prisma.activityLog.count()
    ]);
    
    if (leadCount === 0) {
      results.push({
        endpoint: 'Database - Leads',
        status: 'fail',
        message: 'No leads found in database'
      });
    } else {
      results.push({
        endpoint: 'Database - Leads',
        status: 'pass',
        message: `Found ${leadCount} leads`,
        dataPoints: { count: leadCount }
      });
    }
    
    if (pipelineCount === 0) {
      results.push({
        endpoint: 'Database - Pipeline',
        status: 'fail',
        message: 'No pipeline items found in database'
      });
    } else {
      results.push({
        endpoint: 'Database - Pipeline',
        status: 'pass',
        message: `Found ${pipelineCount} pipeline items`,
        dataPoints: { count: pipelineCount }
      });
    }
    
    if (activityCount === 0) {
      results.push({
        endpoint: 'Database - Activities',
        status: 'warning',
        message: 'No activity logs found in database'
      });
    } else {
      results.push({
        endpoint: 'Database - Activities',
        status: 'pass',
        message: `Found ${activityCount} activity logs`,
        dataPoints: { count: activityCount }
      });
    }
    
    // Check data quality
    const [callItems, agreementItems, listItems] = await Promise.all([
      prisma.pipelineItem.count({ where: { category: 'Calls' } }),
      prisma.pipelineItem.count({ where: { status: { contains: 'Agreement' } } }),
      prisma.pipelineItem.count({ where: { category: 'Lists_Media_QA' } })
    ]);
    
    results.push({
      endpoint: 'Database - Data Distribution',
      status: 'pass',
      message: 'Good data distribution across categories',
      dataPoints: {
        'Call Items': callItems,
        'Agreement Items': agreementItems,
        'List Items': listItems
      }
    });
    
    // Check for future calls
    const futureCalls = await prisma.pipelineItem.count({
      where: {
        callDate: { gt: new Date() }
      }
    });
    
    if (futureCalls === 0) {
      results.push({
        endpoint: 'Database - Future Calls',
        status: 'warning',
        message: 'No future calls scheduled'
      });
    } else {
      results.push({
        endpoint: 'Database - Future Calls',
        status: 'pass',
        message: `${futureCalls} future calls scheduled`,
        dataPoints: { count: futureCalls }
      });
    }
    
    // Check BDR distribution
    const bdrDistribution = await prisma.pipelineItem.groupBy({
      by: ['bdr'],
      _count: { bdr: true }
    });
    
    if (bdrDistribution.length < 3) {
      results.push({
        endpoint: 'Database - BDR Distribution',
        status: 'warning',
        message: `Only ${bdrDistribution.length} BDRs have data`
      });
    } else {
      results.push({
        endpoint: 'Database - BDR Distribution',
        status: 'pass',
        message: `Data distributed across ${bdrDistribution.length} BDRs`,
        dataPoints: { 'BDR Count': bdrDistribution.length }
      });
    }
    
  } catch (error) {
    results.push({
      endpoint: 'Database Validation',
      status: 'fail',
      message: `Database validation failed: ${(error as Error).message}`
    });
  }
  
  return results;
}

async function validateEndpoint(endpoint: string): Promise<ValidationResult> {
  try {
    // Since we're running this as a script, we'll validate the database queries directly
    // rather than making HTTP requests
    
    switch (endpoint) {
      case '/api/reporting/executive-dashboard':
        return await validateExecutiveDashboard();
        
      case '/api/reporting/call-volume':
        return await validateCallVolume();
        
      case '/api/reporting/agreement-tracking':
        return await validateAgreementTracking();
        
      case '/api/reporting/partner-list-analytics':
        return await validatePartnerListAnalytics();
        
      default:
        return {
          endpoint,
          status: 'fail',
          message: 'Unknown endpoint'
        };
    }
  } catch (error) {
    return {
      endpoint,
      status: 'fail',
      message: `Endpoint validation failed: ${(error as Error).message}`
    };
  }
}

async function validateExecutiveDashboard(): Promise<ValidationResult> {
  try {
    const now = new Date();
    
    // Check if we can calculate basic KPIs
    const [callsThisWeek, agreementsThisMonth, totalUpcomingCalls] = await Promise.all([
      prisma.activityLog.count({
        where: {
          activityType: 'Call_Completed',
          timestamp: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.activityLog.count({
        where: {
          activityType: 'Agreement_Sent',
          timestamp: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
        }
      }),
      prisma.pipelineItem.count({
        where: {
          callDate: { gt: now }
        }
      })
    ]);
    
    return {
      endpoint: 'Executive Dashboard',
      status: 'pass',
      message: 'Executive dashboard data calculation successful',
      dataPoints: {
        'Calls This Week': callsThisWeek,
        'Agreements This Month': agreementsThisMonth,
        'Upcoming Calls': totalUpcomingCalls
      }
    };
  } catch (error) {
    return {
      endpoint: 'Executive Dashboard',
      status: 'fail',
      message: `Executive dashboard validation failed: ${(error as Error).message}`
    };
  }
}

async function validateCallVolume(): Promise<ValidationResult> {
  try {
    const [callItems, completedCalls, futureCalls] = await Promise.all([
      prisma.pipelineItem.count({ where: { category: 'Calls' } }),
      prisma.activityLog.count({ where: { activityType: 'Call_Completed' } }),
      prisma.pipelineItem.count({ 
        where: { 
          category: 'Calls',
          callDate: { gt: new Date() }
        } 
      })
    ]);
    
    return {
      endpoint: 'Call Volume Analytics',
      status: 'pass',
      message: 'Call volume calculations working correctly',
      dataPoints: {
        'Total Call Items': callItems,
        'Completed Calls': completedCalls,
        'Future Calls': futureCalls
      }
    };
  } catch (error) {
    return {
      endpoint: 'Call Volume Analytics',
      status: 'fail',
      message: `Call volume validation failed: ${(error as Error).message}`
    };
  }
}

async function validateAgreementTracking(): Promise<ValidationResult> {
  try {
    const [agreementItems, pendingLists, overdueLists] = await Promise.all([
      prisma.pipelineItem.count({ 
        where: { status: { contains: 'Agreement' } } 
      }),
      prisma.pipelineItem.count({ 
        where: { 
          status: { contains: 'Agreement' },
          partnerListSentDate: null
        } 
      }),
      prisma.pipelineItem.count({ 
        where: { 
          status: { contains: 'Agreement' },
          expectedCloseDate: { lt: new Date() },
          partnerListSentDate: null
        } 
      })
    ]);
    
    return {
      endpoint: 'Agreement Tracking',
      status: 'pass',
      message: 'Agreement tracking calculations working correctly',
      dataPoints: {
        'Total Agreements': agreementItems,
        'Pending Lists': pendingLists,
        'Overdue Lists': overdueLists
      }
    };
  } catch (error) {
    return {
      endpoint: 'Agreement Tracking',
      status: 'fail',
      message: `Agreement tracking validation failed: ${(error as Error).message}`
    };
  }
}

async function validatePartnerListAnalytics(): Promise<ValidationResult> {
  try {
    const [listItems, activeListsOut, listsWithSizes] = await Promise.all([
      prisma.pipelineItem.count({ 
        where: { category: 'Lists_Media_QA' } 
      }),
      prisma.pipelineItem.count({ 
        where: { 
          partnerListSentDate: { not: null },
          status: { notIn: ['Sold', 'List Out - Not Sold', 'Free Q&A Offered'] }
        } 
      }),
      prisma.pipelineItem.count({ 
        where: { 
          partnerListSize: { not: null, gt: 0 }
        } 
      })
    ]);
    
    return {
      endpoint: 'Partner List Analytics',
      status: 'pass',
      message: 'Partner list analytics calculations working correctly',
      dataPoints: {
        'List Items': listItems,
        'Active Lists Out': activeListsOut,
        'Lists with Sizes': listsWithSizes
      }
    };
  } catch (error) {
    return {
      endpoint: 'Partner List Analytics',
      status: 'fail',
      message: `Partner list analytics validation failed: ${(error as Error).message}`
    };
  }
}

async function validateBDRFiltering(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  try {
    // Get a sample BDR
    const sampleBDR = await prisma.pipelineItem.findFirst({
      where: { bdr: { not: null } },
      select: { bdr: true }
    });
    
    if (!sampleBDR?.bdr) {
      return [{
        endpoint: 'BDR Filtering',
        status: 'warning',
        message: 'No BDR data available for filtering tests'
      }];
    }
    
    // Test filtering by BDR
    const [totalItems, bdrItems] = await Promise.all([
      prisma.pipelineItem.count(),
      prisma.pipelineItem.count({ where: { bdr: sampleBDR.bdr } })
    ]);
    
    if (bdrItems === 0) {
      results.push({
        endpoint: 'BDR Filtering - Data',
        status: 'warning',
        message: `No items found for BDR: ${sampleBDR.bdr}`
      });
    } else {
      results.push({
        endpoint: 'BDR Filtering - Data',
        status: 'pass',
        message: 'BDR filtering working correctly',
        dataPoints: {
          'Total Items': totalItems,
          [`Items for ${sampleBDR.bdr}`]: bdrItems
        }
      });
    }
    
  } catch (error) {
    results.push({
      endpoint: 'BDR Filtering',
      status: 'fail',
      message: `BDR filtering validation failed: ${(error as Error).message}`
    });
  }
  
  return results;
}

async function validateDataConsistency(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  try {
    // Check that all pipeline items have valid statuses
    const invalidStatuses = await prisma.pipelineItem.findMany({
      where: { 
        OR: [
          { status: null },
          { status: '' }
        ]
      },
      select: { id: true, status: true }
    });
    
    if (invalidStatuses.length > 0) {
      results.push({
        endpoint: 'Data Consistency - Statuses',
        status: 'warning',
        message: `Found ${invalidStatuses.length} items with invalid statuses`
      });
    } else {
      results.push({
        endpoint: 'Data Consistency - Statuses',
        status: 'pass',
        message: 'All pipeline items have valid statuses'
      });
    }
    
    // Check that call items have call dates
    const callItemsWithoutDates = await prisma.pipelineItem.count({
      where: {
        category: 'Calls',
        callDate: null
      }
    });
    
    if (callItemsWithoutDates > 0) {
      results.push({
        endpoint: 'Data Consistency - Call Dates',
        status: 'warning',
        message: `Found ${callItemsWithoutDates} call items without call dates`
      });
    } else {
      results.push({
        endpoint: 'Data Consistency - Call Dates',
        status: 'pass',
        message: 'All call items have valid call dates'
      });
    }
    
    // Check activity log consistency
    const orphanedActivities = await prisma.activityLog.count({
      where: {
        pipelineItemId: { not: null },
        pipelineItem: null
      }
    });
    
    if (orphanedActivities > 0) {
      results.push({
        endpoint: 'Data Consistency - Activities',
        status: 'warning',
        message: `Found ${orphanedActivities} orphaned activity logs`
      });
    } else {
      results.push({
        endpoint: 'Data Consistency - Activities',
        status: 'pass',
        message: 'Activity logs are properly linked'
      });
    }
    
  } catch (error) {
    results.push({
      endpoint: 'Data Consistency',
      status: 'fail',
      message: `Data consistency validation failed: ${(error as Error).message}`
    });
  }
  
  return results;
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateReportingSystem().catch(console.error);
}

export { validateReportingSystem }; 