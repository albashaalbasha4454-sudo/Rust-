import type { Department, Product } from '../types';

export const cleanSectionName = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ');

export const canonicalSectionName = (value: unknown) => {
  const name = cleanSectionName(value);
  if (!name) return 'عام';
  if (name === 'طواجن' || name === 'الطواجن' || name === 'وجبات' || name === 'الوجبات') return 'قسم الشرقي';
  if (name === 'الشرقي' || name === 'شرقي' || name === 'شرقيات') return 'قسم الشرقي';
  if (name === 'الفلافل' || name === 'فلافل') return 'قسم الفلافل';
  if (name === 'المشويات' || name === 'مشويات') return 'قسم المشويات';
  if (name === 'الغربي' || name === 'غربي' || name === 'غربيات') return 'قسم الغربي';
  if (name === 'فرن') return 'الفرن';
  return name;
};

export const makeSectionId = (name: string) => {
  const sectionName = canonicalSectionName(name);
  if (sectionName === 'قسم الفلافل') return 'dept-falafel';
  if (sectionName === 'قسم الشرقي') return 'dept-oriental';
  if (sectionName === 'قسم المشويات') return 'dept-grill';
  if (sectionName === 'قسم الغربي') return 'dept-western';
  if (sectionName === 'الفرن') return 'dept-oven';
  if (sectionName === 'عام') return 'dept-misc';
  return 'dept-custom-' + sectionName.split(' ').join('-');
};

const hasAny = (name: string, words: string[]) => words.some(word => name.includes(word));

export const inferSectionNameFromProduct = (product: Partial<Product>) => {
  const written = canonicalSectionName(product.departmentName || product.category);
  const productName = cleanSectionName(product.name);

  if (written && written !== 'عام' && written !== 'غير مصنف') return written;

  if (hasAny(productName, ['اوزي', 'أوزي', 'مندي', 'رز بخاري', 'فريكة', 'يالنجي', 'كبة', 'حراق', 'صحن فرنسي', 'قمحية', 'فتوش', 'تبولة', 'باشا', 'ششبرك', 'شوربة عدس', 'مسخن', 'فخارة', 'ملوخية', 'حبة دجاج', 'ربع حبة دجاج'])) return 'قسم الشرقي';
  if (hasAny(productName, ['فلافل', 'فول', 'حمص', 'فتة', 'بيض', 'بدوة', 'مخللات', 'ساندويش بطاطا'])) return 'قسم الفلافل';
  if (hasAny(productName, ['كباب لحم', 'كباب جاج', 'كباب دجاج', 'شيش', 'جناحات', 'وردات', 'دبوس'])) return 'قسم المشويات';
  if (hasAny(productName, ['ماريا', 'فاهيتا', 'فرانشيسكو', 'كاري', 'مكسيكي', 'برجر', 'تشيز', 'سودة'])) return 'قسم الغربي';
  if (hasAny(productName, ['بيتزا', 'لحمة', 'جبنه', 'جبنة', 'زعتر', 'محمرة', 'مرتديلا', 'سبانخ', 'كيري', 'شوكولا', 'زيتون', 'سنفورة', 'سجق', 'توشكا'])) return 'الفرن';

  return 'عام';
};

export const normalizeProductSection = (product: Product, departments: Department[] = []): Product => {
  const sectionName = inferSectionNameFromProduct(product);
  const existingDepartment = departments.find(department => canonicalSectionName(department.name) === sectionName || department.id === product.departmentId);
  const departmentName = existingDepartment ? canonicalSectionName(existingDepartment.name) : sectionName;
  const departmentId = existingDepartment ? existingDepartment.id : makeSectionId(departmentName);

  return {
    ...product,
    departmentId,
    departmentName,
    category: departmentName
  };
};

export const buildDepartmentsFromProducts = (departments: Department[], products: Product[]) => {
  const now = new Date().toISOString();
  const result = new Map<string, Department>();

  departments.forEach(department => {
    const name = canonicalSectionName(department.name);
    result.set(name, { ...department, name });
  });

  products.forEach(product => {
    const name = inferSectionNameFromProduct(product);
    if (!result.has(name)) {
      result.set(name, {
        id: makeSectionId(name),
        name,
        status: 'active',
        createdAt: now,
        updatedAt: now
      });
    }
  });

  return Array.from(result.values()).sort((a, b) => a.name.localeCompare(b.name));
};
