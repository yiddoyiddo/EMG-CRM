import { prisma } from "@/lib/db";
import { updateFinanceEntrySchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";
import { exchangeRateService } from "@/lib/exchange-rate";

// GET - Get a single finance entry
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid finance entry ID" },
        { status: 400 }
      );
    }
    
    const financeEntry = await prisma.financeEntry.findUnique({
      where: { id }
    });
    
    if (!financeEntry) {
      return NextResponse.json(
        { error: "Finance entry not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(financeEntry);
    
  } catch (error) {
    console.error("Error fetching finance entry:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance entry" },
      { status: 500 }
    );
  }
}

// PUT - Update a finance entry
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid finance entry ID" },
        { status: 400 }
      );
    }
    
    const data = await req.json();
    
    // Validate the update data
    const validatedData = updateFinanceEntrySchema.parse(data);
    
    // Convert date strings to Date objects
    const processedData: Record<string, unknown> = { ...validatedData };
    if (validatedData.invoiceDate !== undefined) {
      processedData.invoiceDate = validatedData.invoiceDate ? new Date(validatedData.invoiceDate) : null;
    }
    if (validatedData.dueDate !== undefined) {
      processedData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
    }
    if (validatedData.exchangeRateDate !== undefined) {
      processedData.exchangeRateDate = validatedData.exchangeRateDate ? new Date(validatedData.exchangeRateDate) : null;
    }
    
    // Handle USD to GBP conversion logic for updates
    // Only recalculate if sold amount changed and GBP amount is not manually set
    if (validatedData.soldAmount !== undefined && validatedData.soldAmount > 0) {
      // Get the current entry to check if GBP amount was manually set
      const currentEntry = await prisma.financeEntry.findUnique({
        where: { id },
        select: { gbpAmount: true, exchangeRate: true }
      });
      
      // If GBP amount is empty or if we're updating the sold amount, recalculate
      if (!currentEntry?.gbpAmount || validatedData.soldAmount !== undefined) {
        try {
          const rate = await exchangeRateService.getCurrentRate();
          processedData.gbpAmount = exchangeRateService.convertUSDToGBP(validatedData.soldAmount, rate);
          processedData.exchangeRate = rate;
          processedData.exchangeRateDate = new Date();
        } catch (error) {
          console.error('Error converting currency:', error);
          // Continue without conversion if API fails
        }
      }
    }
    
    // Update the finance entry
    const financeEntry = await prisma.financeEntry.update({
      where: { id },
      data: processedData,
    });
    
    return NextResponse.json(financeEntry);
    
  } catch (error) {
    console.error("Error updating finance entry:", error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: 'errors' in error ? error.errors : [] },
        { status: 400 }
      );
    }
    
    // Handle record not found
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: "Finance entry not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update finance entry" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a finance entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid finance entry ID" },
        { status: 400 }
      );
    }
    
    // Delete the finance entry
    await prisma.financeEntry.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: "Finance entry deleted successfully" });
    
  } catch (error) {
    console.error("Error deleting finance entry:", error);
    
    // Handle record not found
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: "Finance entry not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to delete finance entry" },
      { status: 500 }
    );
  }
}