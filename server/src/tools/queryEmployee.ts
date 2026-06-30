import type { ToolDefinition, ToolResult } from '../types/index.js';

/** Mock 员工数据 */
const MOCK_EMPLOYEES = [
  { name: '张三', department: '技术部', position: '高级前端工程师', email: 'zhangsan@company.com', phone: '13800001001' },
  { name: '李四', department: '技术部', position: '后端架构师', email: 'lisi@company.com', phone: '13800001002' },
  { name: '王五', department: '产品部', position: '产品总监', email: 'wangwu@company.com', phone: '13800001003' },
  { name: '赵六', department: '设计部', position: 'UI 设计师', email: 'zhaoliu@company.com', phone: '13800001004' },
  { name: '孙七', department: '市场部', position: '市场经理', email: 'sunqi@company.com', phone: '13800001005' },
  { name: '周八', department: '人事部', position: 'HRBP', email: 'zhouba@company.com', phone: '13800001006' },
  { name: '吴九', department: '技术部', position: 'DevOps 工程师', email: 'wujiu@company.com', phone: '13800001007' },
  { name: '郑十', department: '财务部', position: '财务主管', email: 'zhengshi@company.com', phone: '13800001008' },
];

export const queryEmployeeTool: ToolDefinition = {
  name: 'queryEmployee',
  description: '查询公司内部员工信息，可按姓名（模糊匹配）或部门筛选',
  parameters: [
    { name: 'name', type: 'string', description: '员工姓名，支持模糊匹配', required: false },
    { name: 'department', type: 'string', description: '部门名称，支持模糊匹配', required: false },
  ],
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const nameQuery = (args.name as string)?.trim().toLowerCase() || '';
    const deptQuery = (args.department as string)?.trim() || '';

    if (!nameQuery && !deptQuery) {
      return { success: false, error: '请至少提供姓名或部门作为查询条件' };
    }

    let results = MOCK_EMPLOYEES;

    if (nameQuery) {
      results = results.filter((e) => e.name.includes(nameQuery));
    }

    if (deptQuery) {
      results = results.filter((e) => e.department.includes(deptQuery));
    }

    if (results.length === 0) {
      return {
        success: true,
        data: {
          count: 0,
          employees: [],
          message: `未找到${nameQuery ? `姓名为"${args.name}"` : ''}${nameQuery && deptQuery ? '且' : ''}${deptQuery ? `部门为"${args.department}"` : ''}的员工`,
        },
      };
    }

    return {
      success: true,
      data: {
        count: results.length,
        employees: results,
        queryName: (args.name as string) || undefined,
        queryDept: (args.department as string) || undefined,
      },
    };
  },
};
