/**
 * 医疗影像诊断系统 - Button 组件单元测试
 * 
 * 测试 Button 组件的各种功能和状态
 * 
 * @author 医疗影像团队
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, ButtonGroup, IconButton } from '@/components/ui/Button';
import { Loader2, Plus } from 'lucide-react';

describe('Button Component', () => {
  describe('基础功能', () => {
    it('应该渲染按钮文本', () => {
      render(<Button>点击我</Button>);
      expect(screen.getByRole('button', { name: '点击我' })).toBeInTheDocument();
    });

    it('应该处理点击事件', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>点击我</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('应该支持禁用状态', () => {
      render(<Button disabled>禁用按钮</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });
  });

  describe('变体样式', () => {
    it('应该应用默认变体样式', () => {
      render(<Button>默认按钮</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('应该应用危险变体样式', () => {
      render(<Button variant="destructive">危险按钮</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground');
    });

    it('应该应用轮廓变体样式', () => {
      render(<Button variant="outline">轮廓按钮</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-input', 'bg-background');
    });

    it('应该应用成功变体样式', () => {
      render(<Button variant="success">成功按钮</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-green-600', 'text-white');
    });
  });

  describe('尺寸样式', () => {
    it('应该应用默认尺寸', () => {
      render(<Button>默认尺寸</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'px-4', 'py-2');
    });

    it('应该应用小尺寸', () => {
      render(<Button size="sm">小按钮</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'px-3');
    });

    it('应该应用大尺寸', () => {
      render(<Button size="lg">大按钮</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11', 'px-8');
    });

    it('应该应用图标尺寸', () => {
      render(<Button size="icon">🔍</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'w-10');
    });
  });

  describe('加载状态', () => {
    it('应该显示加载状态', () => {
      render(<Button loading>加载中</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('应该显示自定义加载文本', () => {
      render(<Button loading loadingText="处理中...">提交</Button>);
      
      expect(screen.getByText('处理中...')).toBeInTheDocument();
    });

    it('加载状态下不应该触发点击事件', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button loading onClick={handleClick}>加载中</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('图标支持', () => {
    it('应该显示左侧图标', () => {
      render(<Button leftIcon={<Plus data-testid="left-icon" />}>添加</Button>);
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByText('添加')).toBeInTheDocument();
    });

    it('应该显示右侧图标', () => {
      render(<Button rightIcon={<Plus data-testid="right-icon" />}>添加</Button>);
      
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(screen.getByText('添加')).toBeInTheDocument();
    });
  });

  describe('全宽按钮', () => {
    it('应该应用全宽样式', () => {
      render(<Button fullWidth>全宽按钮</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });
  });

  describe('自定义类名', () => {
    it('应该合并自定义类名', () => {
      render(<Button className="custom-class">自定义按钮</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('bg-primary'); // 默认样式应该保留
    });
  });
});

describe('ButtonGroup Component', () => {
  it('应该渲染按钮组', () => {
    render(
      <ButtonGroup>
        <Button>按钮1</Button>
        <Button>按钮2</Button>
        <Button>按钮3</Button>
      </ButtonGroup>
    );

    expect(screen.getByRole('group')).toBeInTheDocument();
    expect(screen.getByText('按钮1')).toBeInTheDocument();
    expect(screen.getByText('按钮2')).toBeInTheDocument();
    expect(screen.getByText('按钮3')).toBeInTheDocument();
  });

  it('应该应用垂直方向', () => {
    render(
      <ButtonGroup orientation="vertical">
        <Button>按钮1</Button>
        <Button>按钮2</Button>
      </ButtonGroup>
    );

    const group = screen.getByRole('group');
    expect(group).toHaveClass('flex-col');
  });

  it('应该应用连接样式', () => {
    render(
      <ButtonGroup attached>
        <Button>按钮1</Button>
        <Button>按钮2</Button>
        <Button>按钮3</Button>
      </ButtonGroup>
    );

    const group = screen.getByRole('group');
    expect(group).toHaveClass('divide-x');
  });
});

describe('IconButton Component', () => {
  it('应该渲染图标按钮', () => {
    render(
      <IconButton 
        icon={<Plus data-testid="icon" />} 
        aria-label="添加项目"
      />
    );

    expect(screen.getByRole('button', { name: '添加项目' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('应该应用图标按钮尺寸', () => {
    render(
      <IconButton 
        icon={<Plus />} 
        aria-label="添加"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-10', 'w-10');
  });

  it('应该处理点击事件', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(
      <IconButton 
        icon={<Plus />} 
        aria-label="添加"
        onClick={handleClick}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('可访问性', () => {
  it('应该支持键盘导航', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>可访问按钮</Button>);
    
    const button = screen.getByRole('button');
    button.focus();
    
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('应该有正确的 ARIA 属性', () => {
    render(<Button disabled>禁用按钮</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('图标按钮应该有 aria-label', () => {
    render(
      <IconButton 
        icon={<Plus />} 
        aria-label="添加新项目"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '添加新项目');
  });
});
