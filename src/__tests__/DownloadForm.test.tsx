import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DownloadForm from '../components/DownloadForm';

describe('DownloadForm', () => {
  it('valida URL e exibe erro', async () => {
    render(<DownloadForm />);
    fireEvent.change(screen.getByPlaceholderText(/cole o link/i), {
      target: { value: 'invalid-url' },
    });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(/url válida/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem de sucesso para URL válida', async () => {
    render(<DownloadForm />);
    fireEvent.change(screen.getByPlaceholderText(/cole o link/i), {
      target: { value: 'https://instagram.com/p/abc' },
    });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(/download iniciado/i)).toBeInTheDocument();
    });
  });
});
