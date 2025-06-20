using System.Data;
using Dapper;
using MachineMonitoring.Models;
using MySql.Data.MySqlClient;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;

namespace MachineMonitoring.DataAccess.Repository
{
    public class HomeRepo
    {

        private readonly IConfiguration _configuration;
        private readonly ILogger<HomeRepo> _logger;

        public HomeRepo(IConfiguration configuration, ILogger<HomeRepo> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }
        private IDbConnection Connection => new MySqlConnection(_configuration.GetConnectionString("DefaultConnection"));

        #region 'LoginRepo'
        public async Task<List<SystemUser>> GetUserRepo()
        {
            try
            {
                using (var connection = Connection)
                {
                    var query = "Select * FROM vewsystemuser";
                    
                    var check = await connection.QueryAsync<SystemUser>(query);
                    return check.ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in database.");
                throw;
            }
        }
        #endregion

        #region 'ChangePasswordRepo'
        public async Task<bool> ChangePasswordRepo(SystemUser model)
        {
            try
            {
                using (var connection = Connection)
                {
                    var queryupdate = @"UPDATE systemusers SET
                                                Password = @Password,
                                                UpdatedBy = @UpdatedBy
                                            WHERE EmployeeNo = @EmployeeNo";
                    var parameters = new
                    {
                        EmployeeNo = model.EmployeeNo,
                        Password = model.CPassword,
                        UpdatedBy = model.EmployeeNo
                    };

                    var result = await connection.ExecuteAsync(queryupdate, parameters);

                    return result > 0;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving to database.");
                throw; // Let the controller handle the exception
            }
        }
        #endregion


    }
}
