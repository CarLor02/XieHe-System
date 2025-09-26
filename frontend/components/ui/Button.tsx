/**
 * 医疗影像诊断系统 - 按钮组件
 * 
 * 提供统一的按钮样式和交互，支持：
 * - 多种变体和尺寸
 * - 加载状态
 * - 禁用状态
 * - 图标支持
 * - 完全的类型安全
 * 
 * @author 医疗影像团队
 * @version 1.0.0
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * 按钮变体样式定义
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-green-600 text-white hover:bg-green-700',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700',
        info: 'bg-blue-600 text-white hover:bg-blue-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-md px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/**
 * 按钮组件属性接口
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * 是否作为子组件渲染
   */
  asChild?: boolean;
  /**
   * 加载状态
   */
  loading?: boolean;
  /**
   * 加载文本
   */
  loadingText?: string;
  /**
   * 左侧图标
   */
  leftIcon?: React.ReactNode;
  /**
   * 右侧图标
   */
  rightIcon?: React.ReactNode;
  /**
   * 是否为全宽按钮
   */
  fullWidth?: boolean;
}

/**
 * 按钮组件
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    
    // 处理禁用状态
    const isDisabled = disabled || loading;
    
    // 处理按钮内容
    const buttonContent = loading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {loadingText || children}
      </>
    ) : (
      <>
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </>
    );

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          fullWidth && 'w-full'
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

/**
 * 按钮组组件
 */
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 按钮组方向
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * 按钮组尺寸
   */
  size?: VariantProps<typeof buttonVariants>['size'];
  /**
   * 按钮组变体
   */
  variant?: VariantProps<typeof buttonVariants>['variant'];
  /**
   * 是否连接按钮
   */
  attached?: boolean;
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  (
    {
      className,
      orientation = 'horizontal',
      size,
      variant,
      attached = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex',
          orientation === 'vertical' ? 'flex-col' : 'flex-row',
          attached && orientation === 'horizontal' && 'divide-x',
          attached && orientation === 'vertical' && 'divide-y',
          className
        )}
        role="group"
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child) && child.type === Button) {
            return React.cloneElement(child, {
              size: child.props.size || size,
              variant: child.props.variant || variant,
              className: cn(
                child.props.className,
                attached && orientation === 'horizontal' && [
                  index === 0 && 'rounded-r-none',
                  index > 0 && index < React.Children.count(children) - 1 && 'rounded-none',
                  index === React.Children.count(children) - 1 && 'rounded-l-none',
                ],
                attached && orientation === 'vertical' && [
                  index === 0 && 'rounded-b-none',
                  index > 0 && index < React.Children.count(children) - 1 && 'rounded-none',
                  index === React.Children.count(children) - 1 && 'rounded-t-none',
                ]
              ),
            });
          }
          return child;
        })}
      </div>
    );
  }
);

ButtonGroup.displayName = 'ButtonGroup';

/**
 * 图标按钮组件
 */
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon'> {
  /**
   * 图标
   */
  icon: React.ReactNode;
  /**
   * 无障碍标签
   */
  'aria-label': string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, children, size = 'icon', ...props }, ref) => {
    return (
      <Button ref={ref} size={size} {...props}>
        {icon}
        {children}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

export { Button, ButtonGroup, IconButton, buttonVariants };
