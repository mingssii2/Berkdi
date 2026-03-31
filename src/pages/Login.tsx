import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { login, users } = useStore();
  const navigate = useNavigate();

  const handleLogin = (userId: string) => {
    login(userId);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-600">ProExpense</CardTitle>
          <CardDescription>Internal Expense Management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 text-center mb-4">
            Select a mock user to log in and test different roles.
          </p>
          {users.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleLogin(user.id)}
            >
              <LogIn className="mr-2 h-4 w-4" />
              {user.name}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
