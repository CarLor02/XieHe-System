# 医疗影像诊断系统 - 架构图表

## 📊 图表说明

本目录包含医疗影像诊断系统的所有架构图表，使用Mermaid格式定义，支持在线渲染和编辑。

## 📁 文件列表

### 1. 系统架构图 (system-architecture.mmd)
- **描述**: 完整的系统分层架构图
- **内容**: 用户层、负载均衡层、应用层、服务层、数据层、监控层
- **用途**: 系统整体架构设计和技术选型参考

### 2. 数据库关系图 (database-er.mmd)
- **描述**: 完整的数据库实体关系图
- **内容**: 33张核心业务表及其关系
- **用途**: 数据库设计和开发参考

### 3. 数据流图 (data-flow.mmd)
- **描述**: 系统业务流程和数据流向图
- **内容**: 用户认证、患者管理、影像处理、诊断报告等流程
- **用途**: 业务流程设计和接口设计参考

## 🔧 如何使用

### 在线查看
1. **GitHub**: 直接在GitHub中查看.mmd文件，支持Mermaid渲染
2. **Mermaid Live Editor**: https://mermaid.live/
3. **VS Code**: 安装Mermaid Preview插件

### 本地编辑
```bash
# 安装Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# 生成PNG图片
mmdc -i system-architecture.mmd -o system-architecture.png

# 生成SVG图片
mmdc -i database-er.mmd -o database-er.svg

# 生成PDF
mmdc -i data-flow.mmd -o data-flow.pdf
```

### 集成到文档
```markdown
# 在Markdown中引用
![系统架构图](./diagrams/system-architecture.png)

# 或直接嵌入Mermaid代码
```mermaid
graph TB
    A[开始] --> B[处理]
    B --> C[结束]
```

## 📋 图表维护

### 更新流程
1. 修改对应的.mmd文件
2. 使用Mermaid工具验证语法
3. 重新生成图片文件
4. 更新相关文档引用

### 版本控制
- 所有图表文件纳入Git版本控制
- 重大变更时创建新版本分支
- 保持图表与实际架构同步

### 质量检查
- 定期检查图表准确性
- 确保图表与代码实现一致
- 及时更新过时的设计

## 🎨 样式规范

### 颜色定义
- **用户层**: #e1f5fe (浅蓝色)
- **应用层**: #f3e5f5 (浅紫色)
- **服务层**: #e8f5e8 (浅绿色)
- **数据层**: #fff3e0 (浅橙色)
- **监控层**: #fce4ec (浅粉色)

### 图表规范
- 使用统一的命名规范
- 保持图表简洁清晰
- 添加必要的注释说明
- 使用合适的图表类型

---

**维护说明**: 本目录下的图表将随系统架构变更持续更新，确保图表与实际系统保持一致。
