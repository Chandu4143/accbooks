import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Mail, ArrowLeft } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

const ForgotPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    
    try {
      const { error } = await resetPassword(data.email);
      
      if (error) {
        toast.error('There was a problem sending the password reset email. Please try again.');
        return;
      }
      
      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (error) {
      toast.error('An error occurred. Please try again.');
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 text-center mb-6">
        Reset your password
      </h3>
      
      {emailSent ? (
        <div className="text-center space-y-4">
          <div className="rounded-full bg-success-100 p-3 w-12 h-12 mx-auto flex items-center justify-center">
            <Mail className="h-6 w-6 text-success-600" />
          </div>
          
          <p className="text-gray-700">
            Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
          </p>
          
          <div className="pt-4">
            <Link 
              to="/signin" 
              className="text-primary-600 hover:text-primary-500 font-medium flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Return to sign in
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              id="email"
              type="email"
              placeholder="your@email.com"
              leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
              error={errors.email?.message}
              {...register('email')}
            />
            
            <Button 
              type="submit" 
              fullWidth 
              isLoading={isLoading}
            >
              Send Reset Link
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Link 
              to="/signin" 
              className="text-primary-600 hover:text-primary-500 font-medium flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default ForgotPassword;