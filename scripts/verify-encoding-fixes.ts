import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEncodingFixes() {
  try {
    console.log('Verifying encoding fixes...\n');

    // Check specific leads mentioned in the issues
    const specificLeads = [
      'João Costa Madureira',
      'Christoph Brönnimann',
      'Sébastien Page',
      'Emmanuel Gutiérrez-Cortés',
      'Kerem Kızıltunç',
      'Iván González Vallejo',
      'Gönenç Sener'
    ];

    for (const leadName of specificLeads) {
      const lead = await prisma.lead.findFirst({
        where: {
          name: {
            contains: leadName
          }
        }
      });

      if (lead) {
        console.log(`✅ Found: ${lead.name}`);
        console.log(`   Company: ${lead.company || 'null'}`);
        console.log(`   BDR: ${lead.bdr || 'null'}`);
        console.log('');
      } else {
        // Try alternative spellings
        const alternatives = [
          leadName.replace('ã', 'a').replace('ö', 'o').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('ç', 'c'),
          leadName.replace('ã', 'a').replace('ö', 'o').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('ç', 'c').replace('ñ', 'n'),
          leadName.replace('ã', 'a').replace('ö', 'o').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('ç', 'c').replace('ğ', 'g'),
        ];

        let found = false;
        for (const alt of alternatives) {
          const altLead = await prisma.lead.findFirst({
            where: {
              name: {
                contains: alt
              }
            }
          });
          if (altLead) {
            console.log(`⚠️  Found with encoding issue: ${altLead.name} (should be: ${leadName})`);
            console.log(`   Company: ${altLead.company || 'null'}`);
            console.log(`   BDR: ${altLead.bdr || 'null'}`);
            console.log('');
            found = true;
            break;
          }
        }

        if (!found) {
          console.log(`❌ Not found: ${leadName}`);
          console.log('');
        }
      }
    }

    // Check for any remaining encoding issues
    const leadsWithEncodingIssues = await prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: '?' } },
          { name: { contains: '' } },
          { company: { contains: '?' } },
          { company: { contains: '' } }
        ]
      }
    });

    if (leadsWithEncodingIssues.length > 0) {
      console.log('⚠️  Leads with remaining encoding issues:');
      leadsWithEncodingIssues.forEach(lead => {
        console.log(`   - ${lead.name}: Company: ${lead.company}`);
      });
      console.log('');
    } else {
      console.log('✅ No remaining encoding issues found!');
      console.log('');
    }

    // Summary
    const totalLeads = await prisma.lead.count();
    console.log(`Summary: ${totalLeads} total leads checked`);

  } catch (error) {
    console.error('Error verifying encoding fixes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyEncodingFixes(); 