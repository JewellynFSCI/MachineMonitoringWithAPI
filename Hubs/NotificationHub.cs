using MachineMonitoring.Models;
using Microsoft.AspNetCore.SignalR;

namespace MachineMonitoring.Hubs
{
    public class NotificationHub : Hub
    {
        public async Task SendAlert(OwsTicketDetails model)
        {
            await Clients.All.SendAsync("ReceivedAlert", model);
        }

    }
}
