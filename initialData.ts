import type { User, Product, Customer, FinancialAccount, Department } from './types';

// Hashing function for demonstration.
const simpleHash = (password: string, salt: string) => `hashed_${password}_with_${salt}`;

const createInitialUsers = (): User[] => {
    // USE STATIC SALTS FOR PRE-DEFINED USERS
    const adminSalt = 'static_salt_for_admin_user_123';
    const cashierSalt = 'static_salt_for_cashier_user_456';
    return [
        { id: 'user-1', username: 'admin', passwordHash: simpleHash('albasha.123', adminSalt), salt: adminSalt, role: 'admin' },
        { id: 'user-2', username: 'cashier', passwordHash: simpleHash('123', cashierSalt), salt: cashierSalt, role: 'cashier' },
    ];
};

const createInitialDepartments = (): Department[] => {
    const now = new Date().toISOString();
    return [
        { id: 'dept-falafel', name: 'قسم الفلافل', status: 'active', createdAt: now, updatedAt: now },
        { id: 'dept-oriental', name: 'قسم الشرقي', status: 'active', createdAt: now, updatedAt: now },
        { id: 'dept-grill', name: 'قسم المشويات', status: 'active', createdAt: now, updatedAt: now },
        { id: 'dept-western', name: 'قسم الغربي', status: 'active', createdAt: now, updatedAt: now },
        { id: 'dept-meals', name: 'وجبات', status: 'active', createdAt: now, updatedAt: now },
        { id: 'dept-tagine', name: 'طواجن', status: 'active', createdAt: now, updatedAt: now },
        { id: 'dept-oven', name: 'الفرن', status: 'active', createdAt: now, updatedAt: now },
        { id: 'dept-misc', name: 'عام', status: 'active', createdAt: now, updatedAt: now },
    ];
};

const createInitialProducts = (): Product[] => {
    const csvData = `prod-1777547123149,ساندويش بطاطا,product,,قسم الفلافل,,10000,0,True,mod-1,1,,True,prod-1777547123149.webp,4942,2d9b44ba3afd4eea39166ce7d8e2f16073a9931b6be6ee87d7f08e4704802351
prod-1777547218337,اوزي,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547245570,مندي,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547280589,رز بخاري مع دجاج عالفحم,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547299450,فريكة,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547313926,يالنجي,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547336444,كبة مقليه,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547354248,كبة مشوية,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547370535,حراق اصبعه,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547395027,صحن فرنسي,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547414530,قمحية,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547430173,فتوش,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547540899,تبولة,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547555318,متبل,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547571525,مسبحة,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547632849,كبة لبنية,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547702600,باشا وعساكره,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547745928,ششبرك,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547761767,شوربة عدس,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547773365,مسخن,product,,قسم الشرقي,,0,0,True,,0,,False,,0,
prod-1777547800302,كباب لحم,product,,قسم المشويات,,0,0,True,,0,,False,,0,
prod-1777547870943,شيش,product,,قسم المشويات,,0,0,True,"mod-2,mod-1",2,,False,,0,
prod-1777547891688,جناحات ,product,,قسم المشويات,,0,0,True,mod-2,1,,False,,0,
prod-1777547913069,وردات,product,,قسم المشويات,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777547962420,كباب جاج,product,,قسم المشويات,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777547983622,دبوس,product,,قسم المشويات,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548016046,ماريا عالفحم,product,,قسم الغربي,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548095139,حبة دجاج مع الرز 2.5,product,,وجبات ,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548175143,حبة دجاج 1 كيلو رز,product,,وجبات ,,0,0,True,,0,,False,,0,
prod-1777548221981,ربع حبة دجاج 0.5 كيلو رز,product,,وجبات ,,0,0,True,,0,,False,,0,
prod-1777548253878,شيش,product,,قسم الغربي,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548313833,فاهيتا,product,,قسم الغربي,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548392115,فرانشيسكو,product,,قسم الغربي,,0,0,True,"mod-2,mod-1",2,,False,,0,
prod-1777548429794,دجاج مع الكاري ,product,,قسم الغربي,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548457217,مكسيكي ,product,,قسم الغربي,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548483219,برجر دجاج,product,,قسم الغربي,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548503097,برجر لحم,product,,قسم الغربي,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548549046,بطاطا  تشيز,product,,قسم الغربي,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548569517,سودة دجاج,product,,قسم الغربي,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548591086,سوده غنم ,product,,قسم الغربي,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548613707,ماريا عالصاج,product,,قسم الغربي,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548689103,فخارة يبرق,product,,طواجن,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548712077,فخارة محاشي ,product,,طواجن, ,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548772183,فخارة ابوات ,product,,طواجن,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777548854464,لحمة بفخارة,product,,طواجن,,0,0,True,,0,,False,,0,
prod-1777548904407,بطاطا بدجاج بالفخارة,product,,طواجن,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777549121514,فخارتنا,product,,طواجن,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777549176388,بامة بالفخارة ,product,,طواجن,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777549242171,ملوخية بالفخارة ,product,ملوخية ناعمة,طواجن,,0,0,True,"mod-1,mod-2",2,,False,,0,
prod-1777549319555,لحمة,product,,الفرن ,,2000,0,True,,0,,False,,0,
prod-1777549335713,جبنه,product,,الفرن ,,2000,0,True,,0,,False,,0,
prod-1777549393420,زعتر ,product,,الفرن ,,2000,0,True,,0,,False,,0,
prod-1777549414954,محمرة ,product,,الفرن ,,2000,0,True,,0,,False,,0,
prod-1777549439580,مرتديلا قشقوان ,product,,الفرن ,,3000,0,True,,0,,False,,0,
prod-1777549462875,محمرة قشقوان ,product,,الفرن ,,3000,0,True,,0,,False,,0,
prod-1777549572120,بيض بمرتديلا,product,,قسم الفلافل,,10000,0,True,,0,,False,,0,
prod-1777549634573,بيض مسلوق ,product,,قسم الفلافل,,7000,0,True,,0,,False,,0,
prod-1777549666991,بيض مقلي ,product,,قسم الفلافل,,7000,0,True,,0,,False,,0,
prod-1777550577601,بيتزا,product,,الفرن ,,3000,0,True,,0,,False,,0,
prod-1777550599882,سنفورة,product,,الفرن ,,3000,0,True,,0,,False,,0,
prod-1777550612829,سجق,product,,الفرن ,,4000,0,True,,0,,False,,0,
prod-1777550632192,توشكا,product,,الفرن ,,6000,0,True,,0,,False,,0,
prod-1777550650545,سبانخ,product,,الفرن ,,2000,0,True,,0,,False,,0,
prod-1777550666830,كيري,product,,الفرن ,,2000,0,True,,0,,False,,0,
prod-1777550682290,شوكولا,product,,الفرن ,,2000,0,True,,0,,False,,0,
prod-1777550699563,شيش,product,,الفرن ,,5000,0,True,,0,,False,,0,
prod-1777550729041,زيتون,product,,الفرن ,,2000,0,True,,0,,False,,0,
prod-1777550964418,بيتزا عائلي,product,,الفرن ,,60000,0,True,,0,,False,,0,
prod-1777550991859,بيتزا وسط,product,,الفرن ,,40000,0,True,,0,,False,,0,
prod-1777551011093,بيتزا صغير,product,,الفرن ,,20000,0,True,,0,,False,,0,
prod-1777551031505,محمرة ولحمة,product,,الفرن ,,3000,0,True,,0,,False,,0,
prod-1777551061420,محمرة وزعتر,product,,الفرن ,,3000,0,True,,0,,False,,0,
prod-1777551081756,محمرة ومرتديلا,product,,الفرن ,,4000,0,True,,0,,False,,0,
prod-1777551107166,زيتون وقشقوان,product,,الفرن ,,4000,0,True,,0,,False,,0,
prod-1777551272907,زعتر وقشقوان,product,,الفرن ,,3000,0,True,,0,,False,,0,
prod-1777551292806,زعتر وخضار,product,,الفرن ,,3000,0,True,,0,,False,,0,
prod-1777551338906,بيض ولحمة ,product,,الفرن ,,6000,0,True,,0,,False,,0,
prod-1777551542819,بيض مقلي مشروح,product,,قسم الفلافل,,8000,0,True,,0,,False,,0,
prod-1777551592743,بيض مقلي صمون,product,,قسم الفلافل,,9000,0,True,,0,,False,,0,
prod-1777551678268,بيض مسلوق مشروح,product,,قسم الفلافل,,8000,0,True,,0,,False,,0,
prod-1777551704801,بيض مسلوق صمون,product,,قسم الفلافل,,9000,0,True,,0,,False,,0,
prod-1777551782606,بيض بمرتديلا صمون,product,,قسم الفلافل,,12000,0,True,,0,,False,,0,
prod-1777552155640,بيض بمرتديلا مشروح,product,,قسم الفلافل,,11000,0,True,,0,,False,,0,
prod-1777552297421,فول سادة,product,,قسم الفلافل,,16000,0,True,,0,,False,,0,
prod-1777552336487,حمص سادة,product,,قسم الفلافل,,18000,0,True,,0,,False,,0,
prod-1777552359630,فول لبن,product,,,,30000,0,True,,0,,False,,0,
prod-1777552383382,حمص لبن,product,,قسم الفلافل,,30000,0,True,,0,,False,,0,
prod-1777552406242,فول بزيت,product,,قسم الفلافل,,28000,0,True,,0,,False,,0,
prod-1777552444111,فتة بسمنه,product,,قسم الفلافل,,28000,0,True,,0,,False,,0,
prod-1777552466667,حمص بزيت,product,,قسم الفلافل,,28000,0,True,,0,,False,,0,
prod-1777552517302,فتة بزيت,product,,قسم الفلافل,,22000,0,True,,0,,False,,0,
prod-1777552546919,بدوة,product,,قسم الفلافل,,20000,0,True,,0,,False,,0,
prod-1777552623387,مسبحة,product,,قسم الفلافل,,30000,0,True,,0,,False,,0,
prod-1777552641702,متبل,product,,قسم الفلافل,,32000,0,True,,0,,False,,0,
prod-1777552745645,قرص فلافل,product,,قسم الفلافل,,500,0,True,,0,,False,,0,
prod-1777552830229,مخللات 0.5 كيلو,product,,قسم الفلافل,,11000,0,True,,0,,False,,0,
prod-1777552859197,مخللات كيلو,product,,قسم الفلافل,,22000,0,True,,0,,False,,0,
prod-1777552960658,ساندويش فلافل ,product,,قسم الفلافل,,6000,0,True,,0,,False,,0,`;

    const deptMap: {[key: string]: string} = {
        'قسم الفلافل': 'dept-falafel',
        'قسم الشرقي': 'dept-oriental',
        'قسم المشويات': 'dept-grill',
        'قسم الغربي': 'dept-western',
        'وجبات': 'dept-meals',
        'طواجن': 'dept-tagine',
        'الفرن': 'dept-oven',
    };

    const now = new Date().toISOString();

    return csvData.split('\n').filter(line => line.trim() !== '').map(line => {
        const parts = line.split(',');
        if (parts.length < 5) return null;
        
        const name = parts[1]?.trim() || 'صنف غير معروف';
        const category = parts[4]?.trim() || 'عام';
        const deptId = deptMap[category] || 'dept-misc';
        const price = parseFloat(parts[6]) || 0;

        return {
            id: parts[0] || `p-${Math.random().toString(36).substr(2, 9)}`,
            name: name,
            type: (parts[2] as any) || 'product',
            description: parts[3] || '',
            category: category,
            departmentId: deptId,
            departmentName: category,
            price: price,
            status: parts[8] === 'True' ? 'available' : 'unavailable',
            reviewStatus: price > 0 ? 'ok' : 'needs_price',
            createdAt: now,
            updatedAt: now
        } as Product;
    }).filter(p => p !== null) as Product[];
};

const createInitialCustomers = (): Customer[] => {
    return [
        { id: 'cust-1', name: 'عميل نقدي', phone: '0000000000', address: '', email: '', notes: 'عميل افتراضي' },
    ];
};

const createInitialAccounts = (): FinancialAccount[] => {
    return [
        { id: 'cash-default', name: 'الخزينة الرئيسية', type: 'cash' },
        { id: 'bank-default', name: 'الحساب البنكي', type: 'bank' },
    ];
}


export const initialUsers = createInitialUsers();
export const initialProducts = createInitialProducts();
export const initialCustomers = createInitialCustomers();
export const initialAccounts = createInitialAccounts();
export const initialDepartments = createInitialDepartments();
