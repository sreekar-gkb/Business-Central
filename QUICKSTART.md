# BC Deal Sizer - Quick Start Guide

## 🚀 Getting Started (5 minutes)

### Step 1: Start the Development Server

```bash
cd C:\Users\sreek\Downloads\bc-deal-sizer-react
npm run dev
```

Then open: **http://localhost:3000**

### Step 2: Enter Password
The application is protected by a password gate. Enter your credentials to unlock the deal sizer.

### Step 3: Start Using

You'll see the **Pre-Sales Inputs** panel with example data pre-loaded (Southern Cross Distribution). 

**Every change you make updates all calculations instantly** across all 8 tabs.

## 📋 The 8 Tabs Explained

### 1️⃣ **Inputs** (Current Tab)
Fill in your prospect's details:
- Customer name, industry, user count
- Business challenges (select 1+)
- Modules (select which BC features they need)
- Complexity ratings per area
- Migration details (legacy system, data quality)
- Integrations (add/edit integrations they need)
- Customization (custom development scope)
- Reporting requirements
- Localization needs
- Delivery model and timeline
- Support expectations

**💡 Tip**: Start with the customer profile, then work through each section.

### 2️⃣ **Dashboard**
Shows the calculated estimate:
- Expected effort hours
- Duration in months
- Team size (FTE)
- Monthly support cost
- Effort ranges (best/worst case)
- Workstream breakdown
- Role allocations
- Risk distribution

### 3️⃣ **Timeline**
Visual delivery schedule:
- 14 phases from mobilization to transition
- Week-by-week timeline
- Phase duration and dependencies
- Parallel workstreams highlighted

### 4️⃣ **Team**
Who works on the project:
- FTE allocation by role
- 14+ delivery roles (PM, Solutions Architect, Developers, etc.)
- What each role does
- Customer responsibilities

### 5️⃣ **Governance**
Risk & assumptions:
- 15+ assumptions about the scope
- 10-12 risks with probability/impact
- What's excluded from the estimate
- Validation points

### 6️⃣ **Discovery Questions**
Questions to ask the prospect:
- **Critical** questions (prioritized for moving the estimate)
- **Important** follow-ups
- **Nice-to-have** questions
- Auto-generated based on what's still unknown

### 7️⃣ **Executive Summary**
One-page summary:
- What's being delivered
- Why the solution is needed
- Timeline and effort
- Major assumptions
- Support approach
- Commercial summary

### 8️⃣ **Scenarios**
What-if analysis:
- Best case (excellent data quality, one fewer migration cycle)
- Current scenario (your inputs)
- Worst case (poor data quality, extra migration cycle)

## 🎯 Common Workflows

### Creating a New Estimate

1. Go to **Inputs** tab
2. Clear the example data:
   - Change customer name
   - Select actual industry
   - Enter real user count
3. Work through each section:
   - Check the challenges the customer faces
   - Select the BC modules they need
   - Rate complexity in each area
   - Add any integrations required
   - Specify customization level
4. Switch between tabs to see calculated results
5. Use **Discovery Questions** to identify what's still missing
6. Review **Executive Summary** for final numbers

### Adjusting for Complexity

If the estimate seems high:
1. Go to **Inputs** → **Implementation Complexity**
2. Lower the "Overall complexity" rating
3. Lower individual area complexity ratings
4. Check if fewer modules are actually needed

If the estimate seems low:
1. Add more integrations in the **Inputs**
2. Increase customization level
3. Add more modules
4. Check **Governance** tab for what might be missed

### Understanding the Numbers

- **Expected Effort**: The base estimate in hours
- **Duration**: How many months the project takes (typically 8-20 weeks)
- **Team Size**: How many people needed at peak (typically 5-18 people)
- **Monthly Support**: Recurring hours post go-live

The estimate has:
- **Low range**: Best case (good data, simple setup)
- **High range**: Conservative case (complex issues, rework needed)
- **Expected**: Most likely, in the middle

## 🔧 Customizing the Example Data

The example data uses:
- **Customer**: Southern Cross Distribution (Distribution industry)
- **Modules**: 21 modules (Finance, Sales, Purchasing, Inventory, Warehouse)
- **Integrations**: Salesforce, 3PL/EDI, Bank feed
- **Users**: 85 total (60 concurrent)
- **Migration**: From Dynamics NAV, 10 data categories

To **replace with real data**:
1. Go to **Inputs** → **Customer Profile**
2. Change each field to the actual prospect details
3. Every other tab will auto-update

## 📊 Key Metrics

The calculator uses:
- **52 BC Modules** with documented hours each
- **6 User Bands** (1-10, 11-25, 26-75, 76-150, 151-300, 300+)
- **Complexity Factors** (Low=0.82x, Medium=1.0x, High=1.32x, VeryHigh=1.68x)
- **21 Workstreams** (Discovery, Architecture, Finance, Sales, Purchasing, Inventory, Warehouse, Manufacturing, Projects, Service, Reporting, Integrations, Customization, Migration, Security, Testing, Training, Deployment, Hypercare, Documentation, PM)
- **14 Delivery Phases** (Mobilization, Discovery, Design, Config, Dev, Migration, Integration, Testing, UAT, Training, Cutover, Go-Live, Hypercare, Transition)

## ❓ FAQ

### Q: Why does it recalculate instantly?
A: The estimate uses a deterministic algorithm. Every input has a known impact, so React recalculates immediately.

### Q: Can I change the contingency?
A: Yes! Go to **Inputs** → **Implementation Complexity** → **Contingency override %**. Leave blank for automatic.

### Q: What if the customer is in a different country?
A: Update **Inputs** → **Customer Profile** → **Country**, then set **Localization** flags for that region.

### Q: Can I export this estimate?
A: Not yet! In Phase 2, we'll add PDF and Excel export. For now, take a screenshot or use browser print → PDF.

### Q: Why does the estimate change when I add a module?
A: Each module has documentation hours. Adding modules increases both the base effort and the complexity, requiring more testing, training, etc.

### Q: What does "Concurrent Users" mean?
A: Users logged in at the same time (not named users). Affects performance, licensing, and support needs.

## 🎓 Learning the System

To understand how the estimate works:

1. **Look at the Calculation Engine**: `lib/calculator.js` has the algorithm
2. **Check the Constants**: `lib/constants.js` has all the base hours and multipliers
3. **Review the Default Data**: Note how the example translates to hours

## 🚀 Next Steps

1. ✅ Get familiar with the UI (you're doing this now)
2. ✅ Replace example data with a real prospect
3. ✅ Use **Discovery Questions** to identify missing info
4. ✅ Share the **Executive Summary** with your manager
5. 🔜 Export as PDF (coming in Phase 2)
6. 🔜 Track estimate vs. actuals for accuracy

## 💬 Need Help?

- **Questions about the estimate?** Check the **Governance** tab for assumptions
- **Not sure what a field means?** It's labeled and the icon next to it explains it
- **Want to learn the calculations?** Read `REBUILD_NOTES.md`
- **Found a bug?** Check that all inputs are filled and match expectations

## ✨ Pro Tips

1. **Start with modules**: Selecting modules automatically suggests complexity
2. **Use discovery questions as a checklist**: Make sure you've answered the "Critical" ones
3. **Check the timeline**: If duration is too long, reduce scope or increase team
4. **Review scenarios**: Use best/worst case to set expectations with management
5. **Keep the default data**: It's a good reference for typical projects

## 🎉 You're Ready!

Start entering a real prospect and watch the estimate build itself.

**Happy estimating!**
